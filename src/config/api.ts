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
    buildings_dropdown: '/building-dropdown',

    // Mapping endpoints
    mapping_buildings: '/mapping-buildings',
    mapping_buildings_cache: '/mapping-buildings/cache',
    mapping_filter_options: '/admin/mapping-filter-options',
    mapping_regions: '/admin/mapping-region',
    mapping_screen_types: '/admin/mapping-screentype',
    mapping_year_list: '/admin/mapping-yearlist',
    mapping_export: '/admin/mapping-building/export',

    // Potential clients
    potential_clients: '/admin/potentialclient',
    potential_client_get: '/admin/potentialclient/:id',
    potential_client_place: '/admin/potentialclient-place/:id',

    // POI endpoints
    pois_list: '/pois',
    pois_get: '/pois/:id',
    pois_create: '/pois',
    pois_update: '/pois/:id',
    pois_delete: '/pois/:id',

    // Sales packages
    sales_packages_list: '/sales-packages',
    sales_packages_get: '/sales-packages/:id',
    sales_packages_create: '/sales-packages',
    sales_packages_update: '/sales-packages/:id',
    sales_packages_delete: '/sales-packages/:id',

    // Building restrictions
    building_restrictions_list: '/building-restrictions',
    building_restrictions_get: '/building-restrictions/:id',
    building_restrictions_create: '/building-restrictions',
    building_restrictions_update: '/building-restrictions/:id',
    building_restrictions_delete: '/building-restrictions/:id',

    // Saved polygons
    saved_polygons_list: '/saved-polygons',
    saved_polygons_get: '/saved-polygons/:id',
    saved_polygons_create: '/saved-polygons',
    saved_polygons_update: '/saved-polygons/:id',
    saved_polygons_delete: '/saved-polygons/:id',

    // Dashboard report endpoints
    dashboard_acquisition: '/dashboard/acquisition',
    dashboard_building_proposal: '/dashboard/building-proposal',
    dashboard_loi: '/dashboard/loi',
    dashboard_building_lcd_presence: '/dashboard/building-lcd-presence',
  },
}
