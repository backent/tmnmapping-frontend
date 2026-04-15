/**
 * Authentication HTTP Service
 * Handles authentication-related API calls
 */

import { getApi, postApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse } from '@/types/api'

export interface LoginCredentials {
  username: string
  password: string
  remember?: boolean
}

export interface LoginResponse {
  user: {
    id: number
    username: string
    name: string
    role: string
    [key: string]: any
  }
}

export interface User {
  id: number
  username: string
  name: string
  role: string
  last_login?: string
  [key: string]: any
}

/**
 * Login user with credentials
 * Sets HTTP-only cookie on successful authentication
 */
export function postLogin(credentials: LoginCredentials): Promise<ApiResponse<LoginResponse>> {
  return postApi<ApiResponse<LoginResponse>>(apiConfig.endpoints.auth_login, credentials)
}

/**
 * Logout current user
 * Clears HTTP-only cookie
 */
export function postLogout(): Promise<ApiResponse<any>> {
  return postApi<ApiResponse<any>>(apiConfig.endpoints.auth_logout)
}

/**
 * Get current authenticated user
 */
export function getMe(): Promise<ApiResponse<User>> {
  return getApi<ApiResponse<User>>(apiConfig.endpoints.auth_me)
}
