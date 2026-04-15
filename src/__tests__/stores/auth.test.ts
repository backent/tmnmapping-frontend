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

const authorUser: User = {
  id: 2,
  username: 'author1',
  name: 'Author User',
  role: 'author',
}

const approverUser: User = {
  id: 3,
  username: 'approver1',
  name: 'Approver User',
  role: 'approver',
}

const guestUser: User = {
  id: 4,
  username: 'guest1',
  name: 'Guest User',
  role: 'guest',
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
    describe('isAdmin', () => {
      it('returns true when role is "admin"', () => {
        const store = useAuthStore()

        store.currentUser = adminUser
        expect(store.isAdmin).toBe(true)
      })

      it('returns false for other roles', () => {
        const store = useAuthStore()

        store.currentUser = authorUser
        expect(store.isAdmin).toBe(false)
      })

      it('returns false when no user is set', () => {
        const store = useAuthStore()

        expect(store.isAdmin).toBe(false)
      })
    })

    describe('isAuthor', () => {
      it('returns true when role is "author"', () => {
        const store = useAuthStore()

        store.currentUser = authorUser
        expect(store.isAuthor).toBe(true)
      })

      it('returns false for other roles', () => {
        const store = useAuthStore()

        store.currentUser = adminUser
        expect(store.isAuthor).toBe(false)
      })
    })

    describe('isApprover', () => {
      it('returns true when role is "approver"', () => {
        const store = useAuthStore()

        store.currentUser = approverUser
        expect(store.isApprover).toBe(true)
      })

      it('returns false for other roles', () => {
        const store = useAuthStore()

        store.currentUser = adminUser
        expect(store.isApprover).toBe(false)
      })
    })

    describe('isGuest', () => {
      it('returns true when role is "guest"', () => {
        const store = useAuthStore()

        store.currentUser = guestUser
        expect(store.isGuest).toBe(true)
      })

      it('returns false for other roles', () => {
        const store = useAuthStore()

        store.currentUser = adminUser
        expect(store.isGuest).toBe(false)
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
