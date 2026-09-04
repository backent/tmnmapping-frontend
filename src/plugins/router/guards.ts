/**
 * Navigation guard logic, kept out of the router setup so it can be unit tested
 * without mounting an app.
 */

import type { RouteLocationNormalized } from 'vue-router'
import type { Permission } from '@/config/roles'

/** Reachable without a session. */
export const PUBLIC_ROUTES = ['/login']

/**
 * Reachable while signed in regardless of role, so that a denied user has somewhere
 * to land instead of being bounced in a loop.
 */
export const ROLE_EXEMPT_ROUTES = ['/not-authorized']

/** The slice of the auth store the guard depends on. */
export interface AuthGuardStore {
  isAuthenticated: boolean
  currentUser: unknown
  can: (permission: Permission) => boolean
  fetchCurrentUser: () => Promise<unknown>
}

/**
 * Decide where a navigation should go.
 * Returns `true` to allow it, or a path to redirect to.
 */
export async function resolveNavigation(
  to: Pick<RouteLocationNormalized, 'path' | 'meta'>,
  authStore: AuthGuardStore,
): Promise<true | string> {
  if (PUBLIC_ROUTES.includes(to.path)) {
    // Already authenticated — redirect away from login page
    if (authStore.isAuthenticated)
      return '/dashboard'

    return true
  }

  // If we have no user in store (e.g. page refresh), try to restore session
  if (!authStore.currentUser) {
    try {
      await authStore.fetchCurrentUser()
    }
    catch {
      return '/login'
    }
  }

  if (ROLE_EXEMPT_ROUTES.includes(to.path))
    return true

  // Route-level authorization. Routes without a `permission` are open to every
  // authenticated role. The backend enforces the same rules on the API; this only
  // avoids showing a screen whose requests would come back 403.
  const permission = to.meta.permission as Permission | undefined

  if (permission && !authStore.can(permission))
    return '/not-authorized'

  return true
}
