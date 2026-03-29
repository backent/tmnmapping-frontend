export const routes = [
  { path: '/', redirect: '/dashboard' },
  {
    path: '/',
    component: () => import('@/layouts/default.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('@/pages/dashboard.vue'),
      },
      {
        path: 'buildings',
        name: 'buildings',
        component: () => import('@/pages/buildings.vue'),
      },
      {
        path: 'buildings/:id/edit',
        name: 'building-edit',
        component: () => import('@/pages/building-form.vue'),
      },
      {
        path: 'mapping',
        name: 'mapping',
        component: () => import('@/pages/mapping.vue'),
        meta: { layoutWrapperClasses: 'layout-mapping-page' },
      },
      {
        path: 'pois',
        name: 'pois',
        component: () => import('@/pages/pois.vue'),
      },
      {
        path: 'pois/new',
        name: 'poi-new',
        component: () => import('@/pages/poi-form.vue'),
      },
      {
        path: 'pois/:id/edit',
        name: 'poi-edit',
        component: () => import('@/pages/poi-form.vue'),
      },
      {
        path: 'poi-points',
        name: 'poi-points',
        component: () => import('@/pages/poi-points.vue'),
      },
      {
        path: 'poi-points/new',
        name: 'poi-point-new',
        component: () => import('@/pages/poi-point-form.vue'),
      },
      {
        path: 'poi-points/:id/edit',
        name: 'poi-point-edit',
        component: () => import('@/pages/poi-point-form.vue'),
      },
      {
        path: 'sales-packages',
        name: 'sales-packages',
        component: () => import('@/pages/sales-packages.vue'),
      },
      {
        path: 'sales-packages/new',
        name: 'sales-package-new',
        component: () => import('@/pages/sales-package-form.vue'),
      },
      {
        path: 'sales-packages/:id/edit',
        name: 'sales-package-edit',
        component: () => import('@/pages/sales-package-form.vue'),
      },
      {
        path: 'building-restrictions',
        name: 'building-restrictions',
        component: () => import('@/pages/building-restrictions.vue'),
      },
      {
        path: 'building-restrictions/new',
        name: 'building-restriction-new',
        component: () => import('@/pages/building-restriction-form.vue'),
      },
      {
        path: 'building-restrictions/:id/edit',
        name: 'building-restriction-edit',
        component: () => import('@/pages/building-restriction-form.vue'),
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('@/pages/categories.vue'),
      },
      {
        path: 'categories/new',
        name: 'category-new',
        component: () => import('@/pages/category-form.vue'),
      },
      {
        path: 'categories/:id/edit',
        name: 'category-edit',
        component: () => import('@/pages/category-form.vue'),
      },
      {
        path: 'sub-categories',
        name: 'sub-categories',
        component: () => import('@/pages/sub-categories.vue'),
      },
      {
        path: 'sub-categories/new',
        name: 'sub-category-new',
        component: () => import('@/pages/sub-category-form.vue'),
      },
      {
        path: 'sub-categories/:id/edit',
        name: 'sub-category-edit',
        component: () => import('@/pages/sub-category-form.vue'),
      },
      {
        path: 'mother-brands',
        name: 'mother-brands',
        component: () => import('@/pages/mother-brands.vue'),
      },
      {
        path: 'mother-brands/new',
        name: 'mother-brand-new',
        component: () => import('@/pages/mother-brand-form.vue'),
      },
      {
        path: 'mother-brands/:id/edit',
        name: 'mother-brand-edit',
        component: () => import('@/pages/mother-brand-form.vue'),
      },
      {
        path: 'branches',
        name: 'branches',
        component: () => import('@/pages/branches.vue'),
      },
      {
        path: 'branches/new',
        name: 'branch-new',
        component: () => import('@/pages/branch-form.vue'),
      },
      {
        path: 'branches/:id/edit',
        name: 'branch-edit',
        component: () => import('@/pages/branch-form.vue'),
      },
    ],
  },
  {
    path: '/',
    component: () => import('@/layouts/blank.vue'),
    children: [
      {
        path: 'login',
        component: () => import('@/pages/admin-login.vue'),
      },
      {
        path: '/:pathMatch(.*)*',
        component: () => import('@/pages/[...error].vue'),
      },
    ],
  },
]
