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
    buildings_update: '/buildings/:id',
    buildings_sync: '/buildings/sync',
    buildings_filter_options: '/building-filter-options',

    // Mapping endpoints
    mapping_buildings: '/admin/mapping-building',
    mapping_buildings_cache: '/admin/mapping-building/cache',
    mapping_filter_options: '/admin/mapping-filter-options',
    mapping_regions: '/admin/mapping-region',
    mapping_screen_types: '/admin/mapping-screentype',
    mapping_year_list: '/admin/mapping-yearlist',
    mapping_export: '/admin/mapping-building/export',

    // Potential clients
    potential_clients: '/admin/potentialclient',
    potential_client_get: '/admin/potentialclient/:id',
    potential_client_place: '/admin/potentialclient-place/:id',
  },
}
