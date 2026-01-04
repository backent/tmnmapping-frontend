export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  endpoints: {
    // Auth endpoints
    auth_login: '/login',
    auth_logout: '/logout',
    auth_me: '/current-user',
    
    // Building endpoints
    buildings_list: '/buildings',
    buildings_get: '/buildings/:id',
    buildings_create: '/buildings',
    buildings_update: '/buildings/:id',
    buildings_delete: '/buildings/:id',
  },
}
