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
