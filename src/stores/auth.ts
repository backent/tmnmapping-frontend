/**
 * Authentication Store
 * Manages authentication state and user session
 */

import { defineStore } from 'pinia'
import { getMe, postLogin, postLogout } from '@/http/auth'
import type { LoginCredentials, User } from '@/http/auth'
import { APPROVER_ROLES, ROLES, normalizeRole, roleHasAny } from '@/config/roles'
import type { Permission, Role } from '@/config/roles'

interface AuthState {
  currentUser: User | null
  isAuthenticated: boolean
  isLoading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
  }),

  getters: {
    /**
     * The current user's role, mapped onto the canonical vocabulary.
     * `null` when signed out, or when the stored role is not recognised.
     */
    role: (state): Role | null => {
      return normalizeRole(state.currentUser?.role)
    },

    /**
     * Check if user is admin.
     * Admin manages master data and the rate card; it is not an approver role.
     */
    isAdmin(): boolean {
      return this.role === ROLES.ADMIN
    },

    /**
     * Check if user owns quotations
     */
    isSales(): boolean {
      return this.role === ROLES.SALES
    },

    /**
     * Check if user can act on a quotation approval queue
     */
    isApprover(): boolean {
      return roleHasAny(this.role, APPROVER_ROLES)
    },

    /** Permission keys the backend says this user holds. */
    permissions: (state): string[] => {
      return state.currentUser?.permissions ?? []
    },

    /**
     * Check whether the user holds a permission.
     * Used by route meta and the nav to hide what the API would reject.
     *
     * The list comes from the server, so this can never disagree with what the
     * API actually enforces. A user whose session predates the permissions field
     * holds nothing and will be bounced to /not-authorized rather than shown a
     * screen that 403s — deploy backend and frontend together.
     */
    can(): (permission: Permission) => boolean {
      return (permission: Permission): boolean => this.permissions.includes(permission)
    },

    /**
     * Check whether the user holds one of the given roles
     */
    hasAnyRole() {
      return (allowed: readonly Role[]): boolean => roleHasAny(this.role, allowed)
    },

    /**
     * Whether the user may enter quotations, on their own behalf or by proxy.
     * Independent of role: a Head of Sales both approves and sells.
     */
    canCreateQuotations: (state): boolean => {
      return state.currentUser?.can_create_quotations === true
    },

    /**
     * Get user full name
     */
    userName: (state): string => {
      return state.currentUser?.name || ''
    },

    /**
     * Get username
     */
    userUsername: (state): string => {
      return state.currentUser?.username || ''
    },
  },

  actions: {
    /**
     * Login with credentials
     */
    async login(credentials: LoginCredentials) {
      this.isLoading = true

      try {
        const response = await postLogin(credentials)

        if (response.data?.user) {
          this.currentUser = response.data.user
          this.isAuthenticated = true
        }

        return response
      }
      catch (error) {
        this.isAuthenticated = false
        this.currentUser = null
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * Logout current user
     */
    async logout() {
      this.isLoading = true

      try {
        await postLogout()
      }
      catch (error) {
        console.error('Logout error:', error)

        // Continue with logout even if API call fails
      }
      finally {
        this.currentUser = null
        this.isAuthenticated = false
        this.isLoading = false
      }
    },

    /**
     * Fetch current authenticated user
     */
    async fetchCurrentUser() {
      this.isLoading = true

      try {
        const response = await getMe()

        if (response.data) {
          this.currentUser = response.data
          this.isAuthenticated = true
        }

        return response
      }
      catch (error) {
        this.isAuthenticated = false
        this.currentUser = null
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * Clear auth state
     */
    clearAuth() {
      this.currentUser = null
      this.isAuthenticated = false
      this.isLoading = false
    },
  },
})
