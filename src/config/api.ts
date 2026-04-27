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
    pois_import: '/pois-import',
    pois_export: '/pois-export',

    // Sales packages
    sales_packages_list: '/sales-packages',
    sales_packages_get: '/sales-packages/:id',
    sales_packages_create: '/sales-packages',
    sales_packages_update: '/sales-packages/:id',
    sales_packages_delete: '/sales-packages/:id',
    sales_packages_import: '/sales-packages-import',
    sales_packages_export: '/sales-packages-export',

    // Building restrictions
    building_restrictions_list: '/building-restrictions',
    building_restrictions_get: '/building-restrictions/:id',
    building_restrictions_create: '/building-restrictions',
    building_restrictions_update: '/building-restrictions/:id',
    building_restrictions_delete: '/building-restrictions/:id',
    building_restrictions_import: '/building-restrictions-import',
    building_restrictions_export: '/building-restrictions-export',

    // Saved polygons
    saved_polygons_list: '/saved-polygons',
    saved_polygons_get: '/saved-polygons/:id',
    saved_polygons_create: '/saved-polygons',
    saved_polygons_update: '/saved-polygons/:id',
    saved_polygons_delete: '/saved-polygons/:id',

    // Categories
    categories_list: '/categories',
    categories_get: '/categories/:id',
    categories_create: '/categories',
    categories_update: '/categories/:id',
    categories_delete: '/categories/:id',
    categories_dropdown: '/categories-dropdown',
    categories_import: '/categories-import',
    categories_export: '/categories-export',

    // Sub Categories
    sub_categories_list: '/sub-categories',
    sub_categories_get: '/sub-categories/:id',
    sub_categories_create: '/sub-categories',
    sub_categories_update: '/sub-categories/:id',
    sub_categories_delete: '/sub-categories/:id',
    sub_categories_dropdown: '/sub-categories-dropdown',
    sub_categories_import: '/sub-categories-import',
    sub_categories_export: '/sub-categories-export',

    // Mother Brands
    mother_brands_list: '/mother-brands',
    mother_brands_get: '/mother-brands/:id',
    mother_brands_create: '/mother-brands',
    mother_brands_update: '/mother-brands/:id',
    mother_brands_delete: '/mother-brands/:id',
    mother_brands_dropdown: '/mother-brands-dropdown',
    mother_brands_import: '/mother-brands-import',
    mother_brands_export: '/mother-brands-export',

    // Branches
    branches_list: '/branches',
    branches_get: '/branches/:id',
    branches_create: '/branches',
    branches_update: '/branches/:id',
    branches_delete: '/branches/:id',
    branches_dropdown: '/branches-dropdown',
    branches_import: '/branches-import',
    branches_export: '/branches-export',

    // Dashboard report endpoints
    dashboard_acquisition: '/dashboard/acquisition',
    dashboard_building_proposal: '/dashboard/building-proposal',
    dashboard_loi: '/dashboard/loi',
    dashboard_building_lcd_presence: '/dashboard/building-lcd-presence',
  },
}
