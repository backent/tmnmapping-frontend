import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveNavigation } from '@/plugins/router/guards'
import type { AuthGuardStore } from '@/plugins/router/guards'
import { PERMISSIONS, ROLES, roleCan } from '@/config/roles'
import type { Permission, Role } from '@/config/roles'
import { routes } from '@/plugins/router/routes'

/**
 * Build a stand-in for the auth store. `role` drives `can()` through the same
 * permission map the real store uses, so the guard tests stay honest if the map moves.
 */
function makeStore(overrides: Partial<AuthGuardStore> & { role?: Role | null } = {}): AuthGuardStore {
  const { role = ROLES.ADMIN, ...rest } = overrides

  return {
    isAuthenticated: true,
    currentUser: { id: 1, role },
    can: (permission: Permission) => roleCan(role, permission),
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
      const store = makeStore({ role: ROLES.SALES })

      expect(await resolveNavigation(to('/dashboard'), store)).toBe(true)
      expect(await resolveNavigation(to('/mapping'), store)).toBe(true)
    })

    it('allows a permitted route', async () => {
      const store = makeStore({ role: ROLES.ADMIN })

      expect(await resolveNavigation(to('/categories/new', 'master-data.manage'), store)).toBe(true)
    })

    it('redirects to /not-authorized when the role lacks the permission', async () => {
      const store = makeStore({ role: ROLES.SALES })

      expect(await resolveNavigation(to('/categories/new', 'master-data.manage'), store))
        .toBe('/not-authorized')
    })

    it('denies a route when the stored role is unrecognised', async () => {
      const store = makeStore({ role: null })

      expect(await resolveNavigation(to('/pois/new', 'pois.manage'), store)).toBe('/not-authorized')
    })

    // Without this exemption a denied user would bounce between the target route
    // and the landing page forever.
    it('lets a denied user reach /not-authorized whatever their role', async () => {
      expect(await resolveNavigation(to('/not-authorized'), makeStore({ role: ROLES.SALES }))).toBe(true)
      expect(await resolveNavigation(to('/not-authorized'), makeStore({ role: null }))).toBe(true)
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

describe('route permissions', () => {
  const flat = flatten(routes as RouteRecord[])

  it('only references permissions that exist', () => {
    for (const route of flat) {
      if (route.permission)
        expect(Object.keys(PERMISSIONS)).toContain(route.permission)
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
  ])('gates the form route %s', path => {
    const route = flat.find(r => r.path === path)

    expect(route, `route ${path} is missing from the table`).toBeDefined()
    expect(route!.permission, `route ${path} is not gated`).toBeDefined()
    expect(roleCan(ROLES.SALES, route!.permission as Permission)).toBe(false)
  })

  it('gates the users list, not just its forms', () => {
    const route = flat.find(r => r.path === '/users')

    expect(route?.permission).toBe('users.view')
    expect(roleCan(ROLES.SALES, 'users.view')).toBe(false)
    expect(roleCan(ROLES.ADMIN, 'users.view')).toBe(true)
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
