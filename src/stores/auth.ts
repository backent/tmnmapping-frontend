/**
 * Authentication Store
 * Manages authentication state and user session
 */

import { defineStore } from 'pinia'
import { getMe, postLogin, postLogout } from '@/http/auth'
import type { LoginCredentials, User } from '@/http/auth'

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
     * Check if user is admin
     */
    isAdmin: (state): boolean => {
      return state.currentUser?.role === 'admin'
    },

    /**
     * Check if user is author
     */
    isAuthor: (state): boolean => {
      return state.currentUser?.role === 'author'
    },

    /**
     * Check if user is approver
     */
    isApprover: (state): boolean => {
      return state.currentUser?.role === 'approver'
    },

    /**
     * Check if user is guest
     */
    isGuest: (state): boolean => {
      return state.currentUser?.role === 'guest'
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

