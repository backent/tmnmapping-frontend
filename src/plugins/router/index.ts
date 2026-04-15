import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

const PUBLIC_ROUTES = ['/login']

router.beforeEach(async to => {
  const authStore = useAuthStore()

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

  return true
})

export default function (app: App) {
  app.use(router)
}

export { router }
