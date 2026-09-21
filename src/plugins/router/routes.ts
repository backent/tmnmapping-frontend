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
        meta: { permission: 'buildings.manage' },
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
        meta: { permission: 'pois.manage' },
      },
      {
        path: 'pois/:id/edit',
        name: 'poi-edit',
        component: () => import('@/pages/poi-form.vue'),
        meta: { permission: 'pois.manage' },
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
        meta: { permission: 'sales-packages.manage' },
      },
      {
        path: 'sales-packages/:id/edit',
        name: 'sales-package-edit',
        component: () => import('@/pages/sales-package-form.vue'),
        meta: { permission: 'sales-packages.manage' },
      },
      {
        path: 'building-restrictions',
        name: 'building-restrictions',
        component: () => import('@/pages/building-restrictions.vue'),
        meta: { permission: 'building-restrictions.screen' },
      },
      {
        path: 'building-restrictions/new',
        name: 'building-restriction-new',
        component: () => import('@/pages/building-restriction-form.vue'),
        meta: { permission: 'building-restrictions.manage' },
      },
      {
        path: 'building-restrictions/:id/edit',
        name: 'building-restriction-edit',
        component: () => import('@/pages/building-restriction-form.vue'),
        meta: { permission: 'building-restrictions.manage' },
      },
      {
        path: 'categories',
        name: 'categories',
        component: () => import('@/pages/categories.vue'),
        meta: { permission: 'master-data.screen' },
      },
      {
        path: 'categories/new',
        name: 'category-new',
        component: () => import('@/pages/category-form.vue'),
        meta: { permission: 'master-data.manage' },
      },
      {
        path: 'categories/:id/edit',
        name: 'category-edit',
        component: () => import('@/pages/category-form.vue'),
        meta: { permission: 'master-data.manage' },
      },
      {
        path: 'sub-categories',
        name: 'sub-categories',
        component: () => import('@/pages/sub-categories.vue'),
        meta: { permission: 'master-data.screen' },
      },
      {
        path: 'sub-categories/new',
        name: 'sub-category-new',
        component: () => import('@/pages/sub-category-form.vue'),
        meta: { permission: 'master-data.manage' },
      },
      {
        path: 'sub-categories/:id/edit',
        name: 'sub-category-edit',
        component: () => import('@/pages/sub-category-form.vue'),
        meta: { permission: 'master-data.manage' },
      },
      {
        path: 'mother-brands',
        name: 'mother-brands',
        component: () => import('@/pages/mother-brands.vue'),
        meta: { permission: 'master-data.screen' },
      },
      {
        path: 'mother-brands/new',
        name: 'mother-brand-new',
        component: () => import('@/pages/mother-brand-form.vue'),
        meta: { permission: 'master-data.manage' },
      },
      {
        path: 'mother-brands/:id/edit',
        name: 'mother-brand-edit',
        component: () => import('@/pages/mother-brand-form.vue'),
        meta: { permission: 'master-data.manage' },
      },
      {
        path: 'branches',
        name: 'branches',
        component: () => import('@/pages/branches.vue'),
        meta: { permission: 'master-data.screen' },
      },
      {
        path: 'branches/new',
        name: 'branch-new',
        component: () => import('@/pages/branch-form.vue'),
        meta: { permission: 'master-data.manage' },
      },
      {
        path: 'branches/:id/edit',
        name: 'branch-edit',
        component: () => import('@/pages/branch-form.vue'),
        meta: { permission: 'master-data.manage' },
      },
      {
        path: 'customers',
        name: 'customers',
        component: () => import('@/pages/customers.vue'),
        meta: { permission: 'customers.view' },
      },
      {
        path: 'customers/new',
        name: 'customer-new',
        component: () => import('@/pages/customer-form.vue'),
        meta: { permission: 'customers.manage' },
      },
      {
        path: 'customers/:id/edit',
        name: 'customer-edit',
        component: () => import('@/pages/customer-form.vue'),
        meta: { permission: 'customers.manage' },
      },
      {
        path: 'advertiser-brands',
        name: 'advertiser-brands',
        component: () => import('@/pages/brands.vue'),
        meta: { permission: 'brands.view' },
      },
      {
        path: 'advertiser-brands/new',
        name: 'advertiser-brand-new',
        component: () => import('@/pages/advertiser-brand-form.vue'),
        meta: { permission: 'brands.manage' },
      },
      {
        path: 'advertiser-brands/:id/edit',
        name: 'advertiser-brand-edit',
        component: () => import('@/pages/advertiser-brand-form.vue'),
        meta: { permission: 'brands.manage' },
      },
      {
        path: 'sales-assignments',
        name: 'sales-assignments',
        component: () => import('@/pages/sales-assignments.vue'),
        meta: { permission: 'sales-assignments.view' },
      },
      {
        path: 'sales-assignments/new',
        name: 'sales-assignment-new',
        component: () => import('@/pages/sales-assignment-form.vue'),
        meta: { permission: 'sales-assignments.manage' },
      },
      {
        path: 'sales-assignments/:id/edit',
        name: 'sales-assignment-edit',
        component: () => import('@/pages/sales-assignment-form.vue'),
        meta: { permission: 'sales-assignments.manage' },
      },
      {
        path: 'quotations',
        name: 'quotations',
        component: () => import('@/pages/quotations.vue'),
        meta: { permission: 'quotations.view' },
      },
      {
        path: 'quotations/new',
        name: 'quotation-new',
        component: () => import('@/pages/quotation-form.vue'),

        // The capability is per user, not per role, so it cannot be a permission.
        meta: { permission: 'quotations.manage', capability: 'create-quotations' },
      },
      {
        path: 'quotations/:id',
        name: 'quotation-detail',
        component: () => import('@/pages/quotation-detail.vue'),
        meta: { permission: 'quotations.view' },
      },
      {
        path: 'quotations/:id/edit',
        name: 'quotation-edit',
        component: () => import('@/pages/quotation-form.vue'),
        meta: { permission: 'quotations.manage' },
      },
      {
        path: 'building-prices',
        name: 'building-prices',
        component: () => import('@/pages/building-prices.vue'),
        meta: { permission: 'building-prices.view' },
      },
      {
        path: 'building-projects',
        name: 'building-projects',
        component: () => import('@/pages/building-projects.vue'),
        meta: { permission: 'building-projects.view' },
      },
      {
        // 'new' and an id share one component: the form replaces the record either
        // way, so the only difference is whether it starts blank.
        path: 'building-projects/:id',
        name: 'building-project-form',
        component: () => import('@/pages/building-project-form.vue'),
        meta: { permission: 'building-projects.view' },
      },
      {
        // The Rate Cards screens were replaced by Prices on 2026-09-10. Old links
        // and bookmarks land somewhere useful instead of the not-found page.
        path: 'rate-cards',
        redirect: '/building-prices',
      },
      {
        path: 'rate-cards/:id',
        redirect: '/building-prices',
      },
      {
        path: 'users',
        name: 'users',
        component: () => import('@/pages/users.vue'),
        meta: { permission: 'users.view' },
      },
      {
        path: 'users/new',
        name: 'user-new',
        component: () => import('@/pages/user-form.vue'),
        meta: { permission: 'users.manage' },
      },
      {
        path: 'users/:id/edit',
        name: 'user-edit',
        component: () => import('@/pages/user-form.vue'),
        meta: { permission: 'users.manage' },
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
        path: 'not-authorized',
        name: 'not-authorized',
        component: () => import('@/pages/not-authorized.vue'),
      },
      {
        // Printed on the blank layout so the app chrome stays out of the page.
        path: 'quotations/:id/document',
        name: 'quotation-document',
        component: () => import('@/pages/quotation-document.vue'),
        meta: { permission: 'quotations.view' },
      },
      {
        path: '/:pathMatch(.*)*',
        component: () => import('@/pages/[...error].vue'),
      },
    ],
  },
]
