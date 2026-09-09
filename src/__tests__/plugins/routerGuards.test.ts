import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveNavigation } from '@/plugins/router/guards'
import type { AuthGuardStore } from '@/plugins/router/guards'
import type { Permission } from '@/config/roles'
import { routes } from '@/plugins/router/routes'

/**
 * Permissions the backend hands an admin. The guard only ever does a membership
 * check, so the tests supply the list directly rather than re-deriving it — the
 * mapping from role to permission is the backend's business and is tested there.
 */
const ADMIN_PERMISSIONS = [
  'buildings.view',
  'buildings.manage',
  'mapping.view',
  'pois.view',
  'pois.manage',
  'sales-packages.view',
  'sales-packages.manage',
  'building-restrictions.view',
  'building-restrictions.manage',
  'building-restrictions.screen',
  'master-data.view',
  'master-data.manage',
  'master-data.screen',
  'users.view',
  'users.manage',
  'customers.view',
  'customers.manage',
  'brands.view',
  'brands.manage',
  'sales-assignments.view',
  'sales-assignments.manage',
  'rate-cards.view',
  'rate-cards.manage',
  'rate-cards.publish',
  'quotations.view',
  'quotations.manage',
]

/** What a sales user gets: reads only, and none of the management screens. */
const SALES_PERMISSIONS = [
  'buildings.view',
  'mapping.view',
  'pois.view',
  'sales-packages.view',
  'building-restrictions.view',
  'master-data.view',
  'customers.view',
  'brands.view',
  'sales-assignments.view',
  'rate-cards.view',
  'quotations.view',
  'quotations.manage',
]

function makeStore(overrides: Partial<AuthGuardStore> & { permissions?: string[] } = {}): AuthGuardStore {
  const { permissions = ADMIN_PERMISSIONS, ...rest } = overrides

  return {
    isAuthenticated: true,
    currentUser: { id: 1 },
    can: (permission: Permission) => permissions.includes(permission),
    canCreateQuotations: true,
    fetchCurrentUser: vi.fn().mockResolvedValue({}),
    ...rest,
  }
}

function to(path: string, permission?: Permission) {
  return { path, meta: permission ? { permission } : {} }
}

describe('resolveNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('authentication', () => {
    it('allows an anonymous visitor onto the login page', async () => {
      const store = makeStore({ isAuthenticated: false, currentUser: null })

      expect(await resolveNavigation(to('/login'), store)).toBe(true)
    })

    it('redirects an authenticated user away from the login page', async () => {
      expect(await resolveNavigation(to('/login'), makeStore())).toBe('/dashboard')
    })

    it('restores the session when the store is empty', async () => {
      const fetchCurrentUser = vi.fn().mockResolvedValue({})
      const store = makeStore({ currentUser: null, fetchCurrentUser })

      expect(await resolveNavigation(to('/dashboard'), store)).toBe(true)
      expect(fetchCurrentUser).toHaveBeenCalledOnce()
    })

    it('redirects to login when the session cannot be restored', async () => {
      const store = makeStore({
        currentUser: null,
        fetchCurrentUser: vi.fn().mockRejectedValue(new Error('401')),
      })

      expect(await resolveNavigation(to('/dashboard'), store)).toBe('/login')
    })
  })

  describe('authorization', () => {
    it('allows a route with no permission for any role', async () => {
      const store = makeStore({ permissions: SALES_PERMISSIONS })

      expect(await resolveNavigation(to('/dashboard'), store)).toBe(true)
      expect(await resolveNavigation(to('/mapping'), store)).toBe(true)
    })

    it('allows a permitted route', async () => {
      const store = makeStore()

      expect(await resolveNavigation(to('/categories/new', 'master-data.manage'), store)).toBe(true)
    })

    it('redirects to /not-authorized when the role lacks the permission', async () => {
      const store = makeStore({ permissions: SALES_PERMISSIONS })

      expect(await resolveNavigation(to('/categories/new', 'master-data.manage'), store))
        .toBe('/not-authorized')
    })

    // An unrecognised role gets an empty permission list from the backend.
    it('denies a route when the user holds no permissions', async () => {
      const store = makeStore({ permissions: [] })

      expect(await resolveNavigation(to('/pois/new', 'pois.manage'), store)).toBe('/not-authorized')
    })

    // Without this exemption a denied user would bounce between the target route
    // and the landing page forever.
    it('lets a denied user reach /not-authorized whatever their role', async () => {
      expect(await resolveNavigation(to('/not-authorized'), makeStore({ permissions: SALES_PERMISSIONS }))).toBe(true)
      expect(await resolveNavigation(to('/not-authorized'), makeStore({ permissions: [] }))).toBe(true)
    })

    it('still requires a session for /not-authorized', async () => {
      const store = makeStore({
        currentUser: null,
        fetchCurrentUser: vi.fn().mockRejectedValue(new Error('401')),
      })

      expect(await resolveNavigation(to('/not-authorized'), store)).toBe('/login')
    })
  })
})

// ---------------------------------------------------------------------------
// Route table
// ---------------------------------------------------------------------------

interface RouteRecord { path: string; meta?: { permission?: string }; children?: RouteRecord[] }

function flatten(records: RouteRecord[], prefix = ''): { path: string; permission?: string }[] {
  return records.flatMap(record => {
    const path = record.path.startsWith('/')
      ? record.path
      : `${prefix.replace(/\/$/, '')}/${record.path}`

    return [
      ...(record.children ? [] : [{ path, permission: record.meta?.permission }]),
      ...flatten(record.children ?? [], path),
    ]
  })
}

describe('per-user capabilities', () => {
  const newQuotation = { path: '/quotations/new', meta: { permission: 'quotations.manage' as Permission, capability: 'create-quotations' } }

  // The role grants the screen; the account does not. Without this the user fills in
  // a six step wizard whose save can only come back 403.
  it('refuses a route whose capability the account lacks', async () => {
    const store = makeStore({ canCreateQuotations: false })

    await expect(resolveNavigation(newQuotation, store)).resolves.toBe('/not-authorized')
  })

  it('allows it when the account holds the capability', async () => {
    const store = makeStore({ canCreateQuotations: true })

    await expect(resolveNavigation(newQuotation, store)).resolves.toBe(true)
  })

  // The permission is still checked first, so a role that cannot see quotations at
  // all is refused whatever its capability says.
  it('still refuses when the permission is missing', async () => {
    const store = makeStore({ permissions: [], canCreateQuotations: true })

    await expect(resolveNavigation(newQuotation, store)).resolves.toBe('/not-authorized')
  })

  it('ignores the capability check on routes that declare none', async () => {
    const store = makeStore({ canCreateQuotations: false })

    await expect(resolveNavigation(to('/quotations', 'quotations.view'), store)).resolves.toBe(true)
  })
})

describe('route permissions', () => {
  const flat = flatten(routes as RouteRecord[])

  // Every key a route names must be one the backend actually issues, or the guard
  // will reject everyone forever. This list mirrors models/permission.go.
  const BACKEND_PERMISSIONS = [...new Set([...ADMIN_PERMISSIONS, ...SALES_PERMISSIONS])]

  it('only references permissions the backend issues', () => {
    for (const route of flat) {
      if (route.permission)
        expect(BACKEND_PERMISSIONS).toContain(route.permission)
    }
  })

  // Every screen whose only purpose is to write must be gated, or the user reaches a
  // form that can only fail with a 403 on save.
  it.each([
    '/buildings/:id/edit',
    '/pois/new',
    '/pois/:id/edit',
    '/sales-packages/new',
    '/sales-packages/:id/edit',
    '/building-restrictions/new',
    '/building-restrictions/:id/edit',
    '/categories/new',
    '/categories/:id/edit',
    '/sub-categories/new',
    '/sub-categories/:id/edit',
    '/mother-brands/new',
    '/mother-brands/:id/edit',
    '/branches/new',
    '/branches/:id/edit',
    '/users/new',
    '/users/:id/edit',
    '/customers/new',
    '/customers/:id/edit',
    '/advertiser-brands/new',
    '/advertiser-brands/:id/edit',
    '/sales-assignments/new',
    '/sales-assignments/:id/edit',
  ])('gates the form route %s', path => {
    const route = flat.find(r => r.path === path)

    expect(route, `route ${path} is missing from the table`).toBeDefined()
    expect(route!.permission, `route ${path} is not gated`).toBeDefined()
    expect(SALES_PERMISSIONS).not.toContain(route!.permission)
  })

  it('gates the users list, not just its forms', () => {
    const route = flat.find(r => r.path === '/users')

    expect(route?.permission).toBe('users.view')
    expect(SALES_PERMISSIONS).not.toContain('users.view')
    expect(ADMIN_PERMISSIONS).toContain('users.view')
  })

  // Sales need to read advertiser master data to raise a quotation, so the list
  // pages are open to every role while only admin may edit them.
  it.each([
    ['/customers', 'customers.view'],
    ['/advertiser-brands', 'brands.view'],
    ['/sales-assignments', 'sales-assignments.view'],
    ['/rate-cards', 'rate-cards.view'],
    ['/quotations', 'quotations.view'],
  ])('lets any role read %s', (path, permission) => {
    const route = flat.find(r => r.path === path)

    expect(route?.permission).toBe(permission)
    expect(SALES_PERMISSIONS).toContain(permission)
  })

  // These stay open: the mapping page needs the same data for every role.
  it.each(['/dashboard', '/mapping', '/buildings', '/pois', '/sales-packages'])(
    'leaves %s open to every authenticated role',
    path => {
      const route = flat.find(r => r.path === path)

      expect(route).toBeDefined()
      expect(route!.permission).toBeUndefined()
    },
  )
})
