import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth'
import type { User } from '@/http/auth'

// Re-import after mock so we get the mocked versions
import { getMe, postLogin, postLogout } from '@/http/auth'

// ---------------------------------------------------------------------------
// Mock the HTTP layer so no real network calls are made
// ---------------------------------------------------------------------------

vi.mock('@/http/auth', () => ({
  postLogin: vi.fn(),
  postLogout: vi.fn(),
  getMe: vi.fn(),
}))

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const adminUser: User = {
  id: 1,
  username: 'admin',
  name: 'Admin User',
  role: 'admin',
}

const salesUser: User = {
  id: 2,
  username: 'sales1',
  name: 'Sales User',
  role: 'sales',
  can_create_quotations: true,
  sales_group: 'sales_team',
}

const headOfSalesUser: User = {
  id: 3,
  username: 'hos1',
  name: 'Head Of Sales User',
  role: 'head_of_sales',
  can_create_quotations: true,
}

const ceoUser: User = {
  id: 4,
  username: 'ceo',
  name: 'CEO User',
  role: 'ceo',
}

// Role stored before migration 015 rewrote the column.
const legacyApproverUser: User = {
  id: 5,
  username: 'legacy',
  name: 'Legacy Approver',
  role: 'approver',
}

const unknownRoleUser: User = {
  id: 6,
  username: 'wizard',
  name: 'Unknown Role User',
  role: 'wizard',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------

  describe('initial state', () => {
    it('has null currentUser', () => {
      const store = useAuthStore()

      expect(store.currentUser).toBeNull()
    })

    it('is not authenticated', () => {
      const store = useAuthStore()

      expect(store.isAuthenticated).toBe(false)
    })

    it('is not loading', () => {
      const store = useAuthStore()

      expect(store.isLoading).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // Getters
  // -------------------------------------------------------------------------

  describe('getters', () => {
    describe('role', () => {
      it('returns the canonical role', () => {
        const store = useAuthStore()

        store.currentUser = salesUser
        expect(store.role).toBe('sales')
      })

      it('maps a legacy role onto the current vocabulary', () => {
        const store = useAuthStore()

        store.currentUser = legacyApproverUser
        expect(store.role).toBe('head_of_sales')
      })

      it('returns null for an unrecognised role rather than a default', () => {
        const store = useAuthStore()

        store.currentUser = unknownRoleUser
        expect(store.role).toBeNull()
      })

      it('returns null when no user is set', () => {
        const store = useAuthStore()

        expect(store.role).toBeNull()
      })
    })

    describe('isAdmin', () => {
      it('returns true when role is "admin"', () => {
        const store = useAuthStore()

        store.currentUser = adminUser
        expect(store.isAdmin).toBe(true)
      })

      it('returns false for other roles', () => {
        const store = useAuthStore()

        store.currentUser = salesUser
        expect(store.isAdmin).toBe(false)
      })

      it('returns false when no user is set', () => {
        const store = useAuthStore()

        expect(store.isAdmin).toBe(false)
      })
    })

    describe('isSales', () => {
      it('returns true when role is "sales"', () => {
        const store = useAuthStore()

        store.currentUser = salesUser
        expect(store.isSales).toBe(true)
      })

      it('returns false for an approver role', () => {
        const store = useAuthStore()

        store.currentUser = headOfSalesUser
        expect(store.isSales).toBe(false)
      })
    })

    describe('isApprover', () => {
      it.each([
        ['head_of_sales', headOfSalesUser],
        ['ceo', ceoUser],
      ])('returns true for %s', (_role, user) => {
        const store = useAuthStore()

        store.currentUser = user
        expect(store.isApprover).toBe(true)
      })

      // Approval authority follows the sales hierarchy, not system administration.
      it('returns false for admin', () => {
        const store = useAuthStore()

        store.currentUser = adminUser
        expect(store.isApprover).toBe(false)
      })

      it('returns false for sales', () => {
        const store = useAuthStore()

        store.currentUser = salesUser
        expect(store.isApprover).toBe(false)
      })
    })

    describe('can', () => {
      it('grants management permissions to admin', () => {
        const store = useAuthStore()

        store.currentUser = adminUser
        expect(store.can('master-data.manage')).toBe(true)
        expect(store.can('pois.manage')).toBe(true)
      })

      it('denies management permissions to sales', () => {
        const store = useAuthStore()

        store.currentUser = salesUser
        expect(store.can('master-data.manage')).toBe(false)
        expect(store.can('pois.manage')).toBe(false)
      })

      it('grants read permissions to every role', () => {
        const store = useAuthStore()

        store.currentUser = salesUser
        expect(store.can('buildings.view')).toBe(true)
        expect(store.can('mapping.view')).toBe(true)
      })

      it('denies everything when the role is unrecognised', () => {
        const store = useAuthStore()

        store.currentUser = unknownRoleUser
        expect(store.can('buildings.view')).toBe(false)
        expect(store.can('master-data.manage')).toBe(false)
      })

      it('denies everything when no user is set', () => {
        const store = useAuthStore()

        expect(store.can('buildings.view')).toBe(false)
      })
    })

    describe('hasAnyRole', () => {
      it('matches when the role is in the list', () => {
        const store = useAuthStore()

        store.currentUser = ceoUser
        expect(store.hasAnyRole(['sales', 'ceo'])).toBe(true)
      })

      it('does not match when the role is absent', () => {
        const store = useAuthStore()

        store.currentUser = ceoUser
        expect(store.hasAnyRole(['sales', 'admin'])).toBe(false)
      })
    })

    describe('canCreateQuotations', () => {
      it('reflects the capability flag, not the role', () => {
        const store = useAuthStore()

        store.currentUser = salesUser
        expect(store.canCreateQuotations).toBe(true)

        store.currentUser = ceoUser
        expect(store.canCreateQuotations).toBe(false)
      })

      it('is false when no user is set', () => {
        const store = useAuthStore()

        expect(store.canCreateQuotations).toBe(false)
      })
    })

    describe('userName', () => {
      it('returns the user name when set', () => {
        const store = useAuthStore()

        store.currentUser = adminUser
        expect(store.userName).toBe('Admin User')
      })

      it('returns an empty string when no user is set', () => {
        const store = useAuthStore()

        expect(store.userName).toBe('')
      })
    })

    describe('userUsername', () => {
      it('returns the username when set', () => {
        const store = useAuthStore()

        store.currentUser = adminUser
        expect(store.userUsername).toBe('admin')
      })

      it('returns an empty string when no user is set', () => {
        const store = useAuthStore()

        expect(store.userUsername).toBe('')
      })
    })
  })

  // -------------------------------------------------------------------------
  // login action
  // -------------------------------------------------------------------------

  describe('login()', () => {
    it('sets currentUser and isAuthenticated on success', async () => {
      vi.mocked(postLogin).mockResolvedValue({ data: { user: adminUser } })

      const store = useAuthStore()

      await store.login({ username: 'admin', password: 'secret' })

      expect(store.currentUser).toEqual(adminUser)
      expect(store.isAuthenticated).toBe(true)
    })

    it('resets isLoading to false after success', async () => {
      vi.mocked(postLogin).mockResolvedValue({ data: { user: adminUser } })

      const store = useAuthStore()

      await store.login({ username: 'admin', password: 'secret' })

      expect(store.isLoading).toBe(false)
    })

    it('clears auth state and re-throws on failure', async () => {
      vi.mocked(postLogin).mockRejectedValue(new Error('Unauthorised'))

      const store = useAuthStore()

      // Pre-populate state to verify it gets cleared
      store.currentUser = adminUser
      store.isAuthenticated = true

      await expect(store.login({ username: 'bad', password: 'bad' })).rejects.toThrow('Unauthorised')

      expect(store.isAuthenticated).toBe(false)
      expect(store.currentUser).toBeNull()
    })

    it('resets isLoading to false after failure', async () => {
      vi.mocked(postLogin).mockRejectedValue(new Error('Unauthorised'))

      const store = useAuthStore()

      await expect(store.login({ username: 'bad', password: 'bad' })).rejects.toThrow()

      expect(store.isLoading).toBe(false)
    })

    it('returns the raw API response', async () => {
      const mockResponse = { data: { user: adminUser }, message: 'Login successful' }

      vi.mocked(postLogin).mockResolvedValue(mockResponse)

      const store = useAuthStore()
      const result = await store.login({ username: 'admin', password: 'secret' })

      expect(result).toEqual(mockResponse)
    })
  })

  // -------------------------------------------------------------------------
  // logout action
  // -------------------------------------------------------------------------

  describe('logout()', () => {
    it('clears currentUser and isAuthenticated', async () => {
      vi.mocked(postLogout).mockResolvedValue({ data: null })

      const store = useAuthStore()

      store.currentUser = adminUser
      store.isAuthenticated = true

      await store.logout()

      expect(store.currentUser).toBeNull()
      expect(store.isAuthenticated).toBe(false)
    })

    it('resets isLoading to false', async () => {
      vi.mocked(postLogout).mockResolvedValue({ data: null })

      const store = useAuthStore()

      await store.logout()

      expect(store.isLoading).toBe(false)
    })

    it('still clears state even when the API call fails', async () => {
      vi.mocked(postLogout).mockRejectedValue(new Error('Network error'))

      const store = useAuthStore()

      store.currentUser = adminUser
      store.isAuthenticated = true

      // Should NOT throw — logout swallows the API error
      await expect(store.logout()).resolves.toBeUndefined()

      expect(store.currentUser).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.isLoading).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // fetchCurrentUser action
  // -------------------------------------------------------------------------

  describe('fetchCurrentUser()', () => {
    it('sets currentUser and isAuthenticated on success', async () => {
      vi.mocked(getMe).mockResolvedValue({ data: adminUser })

      const store = useAuthStore()

      await store.fetchCurrentUser()

      expect(store.currentUser).toEqual(adminUser)
      expect(store.isAuthenticated).toBe(true)
    })

    it('resets isLoading to false after success', async () => {
      vi.mocked(getMe).mockResolvedValue({ data: adminUser })

      const store = useAuthStore()

      await store.fetchCurrentUser()

      expect(store.isLoading).toBe(false)
    })

    it('clears auth and re-throws on failure', async () => {
      vi.mocked(getMe).mockRejectedValue(new Error('Unauthenticated'))

      const store = useAuthStore()

      store.currentUser = adminUser
      store.isAuthenticated = true

      await expect(store.fetchCurrentUser()).rejects.toThrow('Unauthenticated')

      expect(store.isAuthenticated).toBe(false)
      expect(store.currentUser).toBeNull()
    })

    it('resets isLoading to false after failure', async () => {
      vi.mocked(getMe).mockRejectedValue(new Error('Unauthenticated'))

      const store = useAuthStore()

      await expect(store.fetchCurrentUser()).rejects.toThrow()

      expect(store.isLoading).toBe(false)
    })
  })

  // -------------------------------------------------------------------------
  // clearAuth action
  // -------------------------------------------------------------------------

  describe('clearAuth()', () => {
    it('resets all auth state to defaults', () => {
      const store = useAuthStore()

      store.currentUser = adminUser
      store.isAuthenticated = true
      store.isLoading = true

      store.clearAuth()

      expect(store.currentUser).toBeNull()
      expect(store.isAuthenticated).toBe(false)
      expect(store.isLoading).toBe(false)
    })
  })
})
