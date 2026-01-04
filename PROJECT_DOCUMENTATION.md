# Project Documentation - TMN Admin Template

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Architecture](#project-architecture)
4. [Build Configuration](#build-configuration)
5. [Plugin System](#plugin-system)
6. [Routing System](#routing-system)
7. [Layout System](#layout-system)
8. [Navigation Menu System](#navigation-menu-system)
9. [Component Architecture](#component-architecture)
10. [Theming and Styling](#theming-and-styling)
11. [How to Add New Features](#how-to-add-new-features)
12. [Best Practices](#best-practices)

---

## Project Overview

This is a **TMN Admin Template** - a modern, feature-rich Vue 3 admin dashboard built with Vuetify 3 and TypeScript. It provides a comprehensive starting point for building admin interfaces with pre-built components, layouts, and utilities.

### Key Features
- ✅ Vue 3 with Composition API
- ✅ TypeScript support
- ✅ Vuetify 3 UI framework
- ✅ Vue Router for navigation
- ✅ Pinia for state management
- ✅ Auto-imports for components and composables
- ✅ Vertical navigation with collapsible groups
- ✅ Multiple layouts (default with nav, blank)
- ✅ Dark/Light theme support
- ✅ Responsive design
- ✅ ApexCharts for data visualization
- ✅ Perfect Scrollbar integration

---

## Technology Stack

### Core Dependencies
```json
{
  "vue": "^3.5.13",              // Progressive JavaScript framework
  "vuetify": "3.7.5",            // Material Design component framework
  "vue-router": "^4.5.0",        // Official router for Vue.js
  "pinia": "^2.3.0",             // State management
  "typescript": "^5.7.2",        // Type safety
  "vite": "^5.4.11"              // Build tool
}
```

### Additional Libraries
- **@vueuse/core** & **@vueuse/math** - Collection of Vue composition utilities
- **apexcharts** & **vue3-apexcharts** - Modern charting library
- **vue3-perfect-scrollbar** - Custom scrollbar component
- **@iconify/vue** - Icon framework with thousands of icons
- **prismjs** - Syntax highlighting
- **webfontloader** - Web font loader

### Development Tools
- **unplugin-auto-import** - Auto import APIs on-demand
- **unplugin-vue-components** - Auto import components
- **vite-plugin-vuetify** - Vuetify plugin for Vite
- **vite-svg-loader** - Load SVG files as Vue components

---

## Project Architecture

### Directory Structure

```
template-free/
├── src/
│   ├── @core/                      # Core reusable components and utilities
│   │   ├── components/             # Core UI components (cards, etc.)
│   │   ├── scss/                   # Core SCSS styles
│   │   └── utils/                  # Core utility functions
│   │
│   ├── @layouts/                   # Layout components and utilities
│   │   ├── components/             # Layout-specific components
│   │   │   ├── VerticalNav.vue
│   │   │   ├── VerticalNavLayout.vue
│   │   │   ├── VerticalNavLink.vue
│   │   │   ├── VerticalNavGroup.vue
│   │   │   └── VerticalNavSectionTitle.vue
│   │   ├── styles/                 # Layout-specific styles
│   │   ├── types.ts                # TypeScript type definitions
│   │   └── utils.ts                # Layout utility functions
│   │
│   ├── assets/                     # Static assets
│   │   ├── images/                 # Images and logos
│   │   └── styles/                 # Global styles
│   │
│   ├── components/                 # Application-specific components
│   │   ├── ErrorHeader.vue
│   │   └── UpgradeToPro.vue
│   │
│   ├── layouts/                    # Layout wrappers
│   │   ├── default.vue             # Default layout with navigation
│   │   ├── blank.vue               # Blank layout (login, register)
│   │   └── components/             # Layout wrapper components
│   │       ├── DefaultLayoutWithVerticalNav.vue
│   │       ├── NavItems.vue        # Navigation menu definition
│   │       ├── Footer.vue
│   │       └── UserProfile.vue
│   │
│   ├── pages/                      # Route pages (file-based routing ready)
│   │   ├── dashboard.vue
│   │   ├── login.vue
│   │   ├── register.vue
│   │   ├── account-settings.vue
│   │   └── [other pages]
│   │
│   ├── views/                      # Page-specific view components
│   │   ├── dashboard/              # Dashboard widgets
│   │   ├── pages/                  # Page sections
│   │   └── user-interface/         # UI components
│   │
│   ├── plugins/                    # Vue plugins
│   │   ├── router/                 # Router configuration
│   │   ├── vuetify/                # Vuetify configuration
│   │   ├── iconify/                # Icon configuration
│   │   ├── pinia.ts                # State management
│   │   └── webfontloader.ts        # Font loader
│   │
│   ├── utils/                      # Application utilities
│   │
│   ├── App.vue                     # Root component
│   └── main.ts                     # Application entry point
│
├── public/                         # Public static files
├── vite.config.ts                  # Vite configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json                    # Project dependencies
```

### Architectural Patterns

1. **Component-Based Architecture**: Everything is a Vue component
2. **Composition API**: Uses Vue 3's Composition API throughout
3. **Type Safety**: TypeScript for better development experience
4. **Auto-imports**: Components and composables auto-imported
5. **Modular Plugin System**: Plugins loaded dynamically
6. **Nested Routing**: Parent-child route relationships

---

## Build Configuration

### Vite Configuration (`vite.config.ts`)

#### Key Features

1. **Auto-Import Components**
```typescript
Components({
  dirs: ['src/@core/components', 'src/components'],
  dts: true,  // Generate TypeScript declarations
})
```

2. **Auto-Import Composables**
```typescript
AutoImport({
  imports: ['vue', 'vue-router', '@vueuse/core', '@vueuse/math', 'pinia'],
  vueTemplate: true,
})
```
This means you don't need to import common APIs:
```typescript
// ❌ No need to import
// import { ref, computed, onMounted } from 'vue'
// import { useRoute, useRouter } from 'vue-router'

// ✅ Just use them directly
const count = ref(0)
const route = useRoute()
```

3. **Path Aliases**
```typescript
'@': './src',
'@core': './src/@core',
'@layouts': './src/@layouts',
'@images': './src/assets/images/',
'@styles': './src/assets/styles/',
```

Usage:
```typescript
import MyComponent from '@/components/MyComponent.vue'
import { helpers } from '@core/utils/helpers'
```

4. **Vuetify Integration**
```typescript
vuetify({
  styles: {
    configFile: 'src/assets/styles/variables/_vuetify.scss',
  },
})
```

---

## Plugin System

### How It Works

The project uses a **dynamic plugin registration system** inspired by Nuxt.js. All plugins in `src/plugins/` are automatically loaded.

#### Plugin Registration (`src/@core/utils/plugins.ts`)

```typescript
export const registerPlugins = (app: App) => {
  const imports = import.meta.glob<{ default: (app: App) => void }>(
    ['../../plugins/*.{ts,js}', '../../plugins/*/index.{ts,js}'], 
    { eager: true }
  )
  
  const importPaths = Object.keys(imports).sort()
  
  importPaths.forEach(path => {
    const pluginImportModule = imports[path]
    pluginImportModule.default?.(app)
  })
}
```

**How it works:**
1. Scans `src/plugins/` directory
2. Finds all `.ts`/`.js` files and `index.ts`/`index.js` files in subdirectories
3. Loads them in alphabetical order
4. Executes each plugin's default export function

#### Plugin Structure

Each plugin exports a default function that receives the Vue app instance:

**Example: Pinia Plugin (`src/plugins/pinia.ts`)**
```typescript
import { createPinia } from 'pinia'
import type { App } from 'vue'

export const store = createPinia()

export default function (app: App) {
  app.use(store)
}
```

**Example: Router Plugin (`src/plugins/router/index.ts`)**
```typescript
import type { App } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

export default function (app: App) {
  app.use(router)
}

export { router }
```

### Available Plugins

1. **Router** - Vue Router setup
2. **Pinia** - State management
3. **Vuetify** - UI framework with custom theme
4. **Iconify** - Icon system
5. **Webfontloader** - Font loading

---

## Routing System

### Route Configuration (`src/plugins/router/routes.ts`)

The routing system uses **nested routes** with two main layouts:

```typescript
export const routes = [
  { path: '/', redirect: '/dashboard' },
  
  // Routes with default layout (with navigation)
  {
    path: '/',
    component: () => import('@/layouts/default.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('@/pages/dashboard.vue'),
      },
      {
        path: 'account-settings',
        component: () => import('@/pages/account-settings.vue'),
      },
      // ... more routes
    ],
  },
  
  // Routes with blank layout (no navigation)
  {
    path: '/',
    component: () => import('@/layouts/blank.vue'),
    children: [
      {
        path: 'login',
        component: () => import('@/pages/login.vue'),
      },
      {
        path: 'register',
        component: () => import('@/pages/register.vue'),
      },
      {
        path: '/:pathMatch(.*)*',  // 404 catch-all
        component: () => import('@/pages/[...error].vue'),
      },
    ],
  },
]
```

### Route Structure Explanation

#### 1. Layout-Based Routing
Routes are grouped by their layout:
- **Default Layout**: Pages with sidebar navigation
- **Blank Layout**: Pages without navigation (login, register, error pages)

#### 2. Lazy Loading
All routes use dynamic imports for code splitting:
```typescript
component: () => import('@/pages/dashboard.vue')
```

Benefits:
- Smaller initial bundle size
- Faster page loads
- Better performance

#### 3. Nested Routes
Child routes inherit their parent's layout:
```
Parent: /layouts/default.vue
  └─ Child: /dashboard → /pages/dashboard.vue
  └─ Child: /tables → /pages/tables.vue
```

### How Routing Connects to Layouts

#### App.vue (Root)
```vue
<template>
  <VApp>
    <RouterView />  <!-- Renders layout component -->
  </VApp>
</template>
```

#### layouts/default.vue
```vue
<template>
  <DefaultLayoutWithVerticalNav>
    <RouterView />  <!-- Renders page component -->
  </DefaultLayoutWithVerticalNav>
</template>
```

#### Flow:
```
App.vue 
  → <RouterView /> renders layout (default.vue or blank.vue)
    → Layout's <RouterView /> renders page (dashboard.vue, login.vue, etc.)
```

---

## Layout System

### Available Layouts

#### 1. Default Layout (`src/layouts/default.vue`)

The default layout includes:
- Vertical navigation sidebar
- Top navbar with search, notifications, theme switcher
- Footer
- Main content area

**Structure:**
```vue
<template>
  <DefaultLayoutWithVerticalNav>
    <RouterView />  <!-- Page content goes here -->
  </DefaultLayoutWithVerticalNav>
</template>
```

#### 2. Blank Layout (`src/layouts/blank.vue`)

A minimal layout for authentication pages and errors:
```vue
<template>
  <div class="layout-wrapper layout-blank">
    <RouterView />  <!-- No navigation, just content -->
  </div>
</template>
```

### Layout Architecture

#### DefaultLayoutWithVerticalNav Component

This is the main layout wrapper that orchestrates all layout elements:

**Key Features:**
1. **Responsive Navigation**: Sidebar on desktop, overlay on mobile
2. **Named Slots**: For customization
3. **Composable-Driven**: Uses Vue 3 composition patterns

**Slots Available:**
```typescript
// Header section of vertical nav
#vertical-nav-header="{ toggleIsOverlayNavActive }"

// Navigation items content  
#vertical-nav-content

// Top navbar
#navbar="{ toggleVerticalOverlayNavActive }"

// Footer
#footer

// Default slot for page content
<slot />
```

**Usage in DefaultLayoutWithVerticalNav.vue:**
```vue
<VerticalNavLayout>
  <!-- Navbar -->
  <template #navbar="{ toggleVerticalOverlayNavActive }">
    <div class="d-flex h-100 align-center">
      <IconBtn @click="toggleVerticalOverlayNavActive(true)">
        <VIcon icon="ri-menu-line" />
      </IconBtn>
      <VSpacer />
      <NavbarThemeSwitcher />
      <UserProfile />
    </div>
  </template>

  <!-- Nav Header with Logo -->
  <template #vertical-nav-header>
    <RouterLink to="/" class="app-logo">
      <div v-html="logo" />
      <h1>TMN</h1>
    </RouterLink>
  </template>

  <!-- Nav Items -->
  <template #vertical-nav-content>
    <NavItems />
  </template>

  <!-- Page Content -->
  <slot />

  <!-- Footer -->
  <template #footer>
    <Footer />
  </template>
</VerticalNavLayout>
```

### VerticalNavLayout Component (`@layouts/components/VerticalNavLayout.vue`)

This is the core layout engine using Vue's render function:

**Key Responsibilities:**
1. **Layout Structure**: Creates the HTML structure
2. **Responsive Behavior**: Manages mobile overlay
3. **State Management**: Handles nav open/close state

**Render Structure:**
```typescript
return h('div', { class: 'layout-wrapper' }, [
  verticalNav,        // Sidebar navigation
  h('div', { class: 'layout-content-wrapper' }, [
    navbar,           // Top navbar
    main,             // Main content area
    footer,           // Footer
  ]),
  layoutOverlay,      // Mobile overlay
])
```

**Responsive Behavior:**
- **Desktop (≥1280px)**: Sidebar always visible, content has left padding
- **Mobile (<1280px)**: Sidebar hidden by default, shows as overlay when toggled

---

## Navigation Menu System

### How Navigation Works

The navigation system is built with three main components:

1. **VerticalNavLink** - Single navigation item
2. **VerticalNavGroup** - Collapsible group of items
3. **VerticalNavSectionTitle** - Section header

### NavItems Component (`src/layouts/components/NavItems.vue`)

This defines the entire navigation structure:

```vue
<template>
  <!-- Dashboards Group -->
  <VerticalNavGroup
    :item="{
      title: 'Dashboards',
      badgeContent: '5',
      badgeClass: 'bg-error',
      icon: 'ri-home-smile-line',
    }"
  >
    <VerticalNavLink
      :item="{
        title: 'Analytics',
        to: '/dashboard',
      }"
    />
    <VerticalNavLink
      :item="{
        title: 'CRM',
        href: 'https://example.com',
        target: '_blank',
        badgeContent: 'Pro',
        badgeClass: 'bg-light-primary text-primary',
      }"
    />
  </VerticalNavGroup>

  <!-- Section Title -->
  <VerticalNavSectionTitle
    :item="{ heading: 'Apps & Pages' }"
  />

  <!-- Single Link -->
  <VerticalNavLink
    :item="{
      title: 'Account Settings',
      icon: 'ri-user-settings-line',
      to: '/account-settings',
    }"
  />
</template>
```

### Navigation Component Details

#### 1. VerticalNavLink (`@layouts/components/VerticalNavLink.vue`)

**Props Type:**
```typescript
interface NavLink {
  title: string              // Display text
  icon?: string              // Iconify icon name
  to?: string                // Vue Router path
  href?: string              // External URL
  target?: string            // Link target (_blank, etc.)
  badgeContent?: string      // Badge text
  badgeClass?: string        // Badge styling
  disable?: boolean          // Disabled state
}
```

**Component Logic:**
```vue
<Component
  :is="item.to ? 'RouterLink' : 'a'"
  :to="item.to"
  :href="item.href"
  :target="item.target"
>
  <VIcon :icon="item.icon || 'ri-checkbox-blank-circle-line'" />
  <span>{{ item.title }}</span>
  <span :class="item.badgeClass">{{ item.badgeContent }}</span>
</Component>
```

**Smart Component Switching:**
- Uses `RouterLink` if `to` prop provided (internal navigation)
- Uses `<a>` tag if `href` prop provided (external links)

#### 2. VerticalNavGroup (`@layouts/components/VerticalNavGroup.vue`)

Creates collapsible navigation groups:

**Props Type:**
```typescript
interface NavGroup {
  title: string
  icon?: string
  badgeContent?: string
  badgeClass?: string
}
```

**Features:**
- **Toggle State**: `isOpen` ref for expand/collapse
- **Smooth Animation**: CSS Grid animation for height
- **Nested Items**: Uses `<slot />` for child links

**Component Structure:**
```vue
<li class="nav-group" :class="isOpen && 'open'">
  <div class="nav-group-label" @click="isOpen = !isOpen">
    <VIcon :icon="item.icon" />
    <span>{{ item.title }}</span>
    <VIcon icon="ri-arrow-right-s-line" class="nav-group-arrow" />
  </div>
  <div class="nav-group-children-wrapper">
    <ul class="nav-group-children">
      <slot />  <!-- Child VerticalNavLink components -->
    </ul>
  </div>
</li>
```

**CSS Animation:**
```scss
.nav-group-children-wrapper {
  display: grid;
  grid-template-rows: 0fr;  // Collapsed
  transition: grid-template-rows 0.3s ease-in-out;
}

.nav-group.open .nav-group-children-wrapper {
  grid-template-rows: 1fr;  // Expanded
}
```

#### 3. VerticalNavSectionTitle (`@layouts/components/VerticalNavSectionTitle.vue`)

Simple section header:

```vue
<template>
  <li class="nav-section-title">
    <span v-text="item.heading" />
  </li>
</template>
```

### Adding New Navigation Items

#### Example 1: Add Single Link
```vue
<VerticalNavLink
  :item="{
    title: 'My New Page',
    icon: 'ri-file-line',
    to: '/my-new-page',
  }"
/>
```

#### Example 2: Add Link with Badge
```vue
<VerticalNavLink
  :item="{
    title: 'Beta Feature',
    icon: 'ri-flask-line',
    to: '/beta-feature',
    badgeContent: 'New',
    badgeClass: 'bg-success',
  }"
/>
```

#### Example 3: Add External Link
```vue
<VerticalNavLink
  :item="{
    title: 'Documentation',
    icon: 'ri-book-line',
    href: 'https://docs.example.com',
    target: '_blank',
  }"
/>
```

#### Example 4: Add Collapsible Group
```vue
<VerticalNavGroup
  :item="{
    title: 'User Management',
    icon: 'ri-user-line',
    badgeContent: '3',
  }"
>
  <VerticalNavLink :item="{ title: 'Users List', to: '/users' }" />
  <VerticalNavLink :item="{ title: 'Roles', to: '/roles' }" />
  <VerticalNavLink :item="{ title: 'Permissions', to: '/permissions' }" />
</VerticalNavGroup>
```

#### Example 5: Add Section
```vue
<VerticalNavSectionTitle :item="{ heading: 'My Section' }" />
<VerticalNavLink :item="{ title: 'Item 1', to: '/item1' }" />
<VerticalNavLink :item="{ title: 'Item 2', to: '/item2' }" />
```

---

## Component Architecture

### Core Components (`src/@core/components/`)

These are reusable components used throughout the application:

#### 1. Card Components

##### CardStatisticsVertical
```vue
<CardStatisticsVertical
  title="Total Profit"
  color="secondary"
  icon="ri-pie-chart-2-line"
  stats="$25.6k"
  :change="42"
  subtitle="Weekly Project"
/>
```

**Props:**
- `title`: Card title
- `color`: Vuetify color theme
- `icon`: Iconify icon name
- `stats`: Main statistic value
- `change`: Percentage change (positive/negative)
- `subtitle`: Description text

##### CardStatisticsHorizontal
Similar to vertical but with horizontal layout.

##### CardStatisticsWithImages
Card with custom image background.

#### 2. Utility Components

##### MoreBtn
Three-dot menu button:
```vue
<MoreBtn />
```

##### ThemeSwitcher
Toggle between light/dark themes:
```vue
<ThemeSwitcher />
```

### Auto-Imported Components

Thanks to `unplugin-vue-components`, components from these directories are auto-imported:
- `src/@core/components/`
- `src/components/`

**Example:**
```vue
<template>
  <!-- No import needed! -->
  <CardStatisticsVertical v-bind="statsData" />
  <ThemeSwitcher />
</template>

<script setup lang="ts">
// ✅ Components automatically available
// ❌ No need for:
// import CardStatisticsVertical from '@core/components/cards/CardStatisticsVertical.vue'
</script>
```

### Page Structure Pattern

Pages typically follow this pattern:

```vue
<script setup lang="ts">
// 1. Import view components (not auto-imported)
import MyWidget from '@/views/my-page/MyWidget.vue'

// 2. Define reactive data
const userData = ref([])
const loading = ref(false)

// 3. Define methods
const fetchData = async () => {
  loading.value = true
  // fetch logic
  loading.value = false
}

// 4. Lifecycle
onMounted(() => {
  fetchData()
})
</script>

<template>
  <!-- Use Vuetify grid system -->
  <VRow>
    <VCol cols="12" md="6">
      <MyWidget :data="userData" />
    </VCol>
    <VCol cols="12" md="6">
      <CardStatisticsVertical v-bind="stats" />
    </VCol>
  </VRow>
</template>
```

---

## Theming and Styling

### Vuetify Theme Configuration

#### Theme Definition (`src/plugins/vuetify/theme.ts`)

```typescript
export const themes = {
  light: {
    dark: false,
    colors: {
      primary: '#8C57FF',
      secondary: '#8A8D93',
      success: '#56CA00',
      info: '#16B1FF',
      warning: '#FFB400',
      error: '#FF4C51',
      background: '#f4f5fa',
      surface: '#fff',
      // ... more colors
    },
  },
  dark: {
    dark: true,
    colors: {
      primary: '#8C57FF',
      background: '#28243D',
      surface: '#312d4b',
      // ... more colors
    },
  },
}
```

#### Using Theme Colors

```vue
<template>
  <!-- Vuetify color props -->
  <VBtn color="primary">Primary Button</VBtn>
  <VCard color="success">Success Card</VCard>
  <VAlert color="warning">Warning Alert</VAlert>
  
  <!-- Background colors -->
  <div class="bg-primary">Primary Background</div>
  <div class="bg-surface">Surface Background</div>
</template>
```

### Component Defaults (`src/plugins/vuetify/defaults.ts`)

Global defaults for Vuetify components:

```typescript
export default {
  VBtn: {
    color: 'primary',  // All buttons are primary by default
  },
  VTextField: {
    variant: 'outlined',
    density: 'comfortable',
    color: 'primary',
    hideDetails: 'auto',
  },
  VSelect: {
    variant: 'outlined',
    color: 'primary',
    density: 'comfortable',
  },
  // ... more defaults
}
```

### SCSS Architecture

#### Style Loading Order
```typescript
// main.ts
import '@core/scss/template/index.scss'  // Core styles
import '@layouts/styles/index.scss'       // Layout styles
```

#### Core SCSS Structure
```
src/@core/scss/
├── base/
│   ├── _variables.scss      # SCSS variables
│   ├── _mixins.scss         # Reusable mixins
│   ├── _components.scss     # Component styles
│   └── _utilities.scss      # Utility classes
└── template/
    ├── index.scss           # Main entry point
    ├── libs/                # Third-party overrides
    └── pages/               # Page-specific styles
```

#### Layout SCSS Structure
```
src/@layouts/styles/
├── _variables.scss          # Layout variables
├── _mixins.scss            # Layout mixins
├── _default-layout.scss    # Default layout styles
└── index.scss              # Entry point
```

### Using Custom Styles

#### Method 1: Scoped Styles
```vue
<template>
  <div class="my-component">
    <h1>Title</h1>
  </div>
</template>

<style lang="scss" scoped>
.my-component {
  padding: 1rem;
  
  h1 {
    color: rgb(var(--v-theme-primary));
  }
}
</style>
```

#### Method 2: Global Styles
```vue
<style lang="scss">
// Not scoped - affects globally
.global-utility {
  margin-bottom: 2rem;
}
</style>
```

#### Method 3: Using SCSS Variables
```vue
<style lang="scss" scoped>
@use "@configured-variables" as variables;

.my-component {
  padding: variables.$spacer;
  background: variables.$primary-color;
}
</style>
```

### Dark Mode

#### Checking Current Theme
```vue
<script setup lang="ts">
import { useTheme } from 'vuetify'

const theme = useTheme()

// Current theme name
console.log(theme.global.name.value)  // 'light' or 'dark'

// Check if dark mode
const isDark = computed(() => theme.global.name.value === 'dark')
</script>
```

#### Theme-Aware Styling
```vue
<template>
  <div :class="isDark ? 'dark-specific' : 'light-specific'">
    Content
  </div>
</template>

<style lang="scss">
.dark-specific {
  background: #1a1a1a;
}

.light-specific {
  background: #ffffff;
}
</style>
```

---

## How to Add New Features

### 1. Adding a New Page

#### Step 1: Create the Page Component
```bash
# Create new page file
touch src/pages/my-new-page.vue
```

```vue
<!-- src/pages/my-new-page.vue -->
<script setup lang="ts">
import { ref } from 'vue'

const pageTitle = ref('My New Page')
</script>

<template>
  <div>
    <h1>{{ pageTitle }}</h1>
    <VCard>
      <VCardText>
        Page content goes here
      </VCardText>
    </VCard>
  </div>
</template>
```

#### Step 2: Add Route
```typescript
// src/plugins/router/routes.ts
export const routes = [
  // ... existing routes
  {
    path: '/',
    component: () => import('@/layouts/default.vue'),
    children: [
      // ... existing children
      {
        path: 'my-new-page',
        component: () => import('@/pages/my-new-page.vue'),
      },
    ],
  },
]
```

#### Step 3: Add Navigation Link
```vue
<!-- src/layouts/components/NavItems.vue -->
<template>
  <!-- ... existing nav items -->
  
  <VerticalNavLink
    :item="{
      title: 'My New Page',
      icon: 'ri-file-line',
      to: '/my-new-page',
    }"
  />
</template>
```

#### Step 4: Access Your Page
Navigate to `http://localhost:3000/my-new-page`

### 2. Adding a New Layout

#### Create Custom Layout
```vue
<!-- src/layouts/custom.vue -->
<script setup lang="ts">
// Custom layout logic
</script>

<template>
  <div class="custom-layout">
    <header>Custom Header</header>
    <main>
      <RouterView />
    </main>
    <footer>Custom Footer</footer>
  </div>
</template>

<style lang="scss" scoped>
.custom-layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  
  main {
    flex: 1;
    padding: 2rem;
  }
}
</style>
```

#### Use Custom Layout in Routes
```typescript
// src/plugins/router/routes.ts
{
  path: '/custom',
  component: () => import('@/layouts/custom.vue'),
  children: [
    {
      path: 'page1',
      component: () => import('@/pages/custom-page1.vue'),
    },
  ],
}
```

### 3. Adding a New Plugin

#### Create Plugin File
```typescript
// src/plugins/my-plugin.ts
import type { App } from 'vue'

export default function (app: App) {
  // Plugin initialization
  console.log('My plugin loaded!')
  
  // Add global properties
  app.config.globalProperties.$myMethod = () => {
    console.log('Global method called')
  }
  
  // Add global components
  app.component('MyGlobalComponent', MyComponent)
  
  // Use third-party library
  // app.use(SomeLibrary)
}
```

Plugin automatically loaded thanks to `registerPlugins` function!

### 4. Creating Reusable Components

#### Core Component (Auto-imported)
```vue
<!-- src/@core/components/MyReusableCard.vue -->
<script setup lang="ts">
interface Props {
  title: string
  content: string
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  color: 'primary',
})
</script>

<template>
  <VCard :color="props.color">
    <VCardTitle>{{ props.title }}</VCardTitle>
    <VCardText>{{ props.content }}</VCardText>
  </VCard>
</template>
```

#### Usage (No Import Needed!)
```vue
<!-- Any page -->
<template>
  <MyReusableCard
    title="Hello"
    content="This component is auto-imported!"
    color="success"
  />
</template>
```

### 5. Adding State Management (Pinia Store)

#### Create Store
```typescript
// src/stores/user.ts
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref(null)
  const isLoggedIn = ref(false)
  
  // Getters
  const userName = computed(() => user.value?.name || 'Guest')
  
  // Actions
  const login = async (credentials: any) => {
    // Login logic
    user.value = await fetchUser(credentials)
    isLoggedIn.value = true
  }
  
  const logout = () => {
    user.value = null
    isLoggedIn.value = false
  }
  
  return {
    user,
    isLoggedIn,
    userName,
    login,
    logout,
  }
})
```

#### Use Store in Components
```vue
<script setup lang="ts">
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// Access state
console.log(userStore.user)
console.log(userStore.userName)

// Call actions
const handleLogin = () => {
  userStore.login({ email: 'test@example.com', password: 'pass' })
}
</script>

<template>
  <div>
    <p v-if="userStore.isLoggedIn">
      Welcome, {{ userStore.userName }}
    </p>
    <VBtn v-else @click="handleLogin">
      Login
    </VBtn>
  </div>
</template>
```

### 6. Adding API Integration

#### Create API Service
```typescript
// src/services/api.ts
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      router.push('/login')
    }
    return Promise.reject(error)
  }
)

export default apiClient
```

#### Create Resource Services
```typescript
// src/services/users.service.ts
import apiClient from './api'

export interface User {
  id: number
  name: string
  email: string
}

export const usersService = {
  getAll: () => apiClient.get<User[]>('/users'),
  
  getById: (id: number) => apiClient.get<User>(`/users/${id}`),
  
  create: (data: Partial<User>) => apiClient.post<User>('/users', data),
  
  update: (id: number, data: Partial<User>) => 
    apiClient.put<User>(`/users/${id}`, data),
  
  delete: (id: number) => apiClient.delete(`/users/${id}`),
}
```

#### Use in Components
```vue
<script setup lang="ts">
import { usersService } from '@/services/users.service'

const users = ref([])
const loading = ref(false)

const fetchUsers = async () => {
  loading.value = true
  try {
    users.value = await usersService.getAll()
  } catch (error) {
    console.error('Failed to fetch users:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <VProgressCircular v-if="loading" indeterminate />
  
  <VList v-else>
    <VListItem
      v-for="user in users"
      :key="user.id"
      :title="user.name"
      :subtitle="user.email"
    />
  </VList>
</template>
```

### 7. Adding Form Validation

#### Using VeeValidate (Example)
```bash
npm install vee-validate yup
```

```vue
<script setup lang="ts">
import { useForm, useField } from 'vee-validate'
import * as yup from 'yup'

// Define validation schema
const schema = yup.object({
  email: yup.string().required().email(),
  password: yup.string().required().min(8),
})

// Setup form
const { handleSubmit, errors } = useForm({
  validationSchema: schema,
})

// Setup fields
const { value: email } = useField('email')
const { value: password } = useField('password')

// Submit handler
const onSubmit = handleSubmit(values => {
  console.log('Form submitted:', values)
})
</script>

<template>
  <VForm @submit.prevent="onSubmit">
    <VTextField
      v-model="email"
      label="Email"
      type="email"
      :error-messages="errors.email"
    />
    
    <VTextField
      v-model="password"
      label="Password"
      type="password"
      :error-messages="errors.password"
    />
    
    <VBtn type="submit" color="primary">
      Submit
    </VBtn>
  </VForm>
</template>
```

### 8. Adding Charts (ApexCharts)

```vue
<script setup lang="ts">
import VueApexCharts from 'vue3-apexcharts'

const chartOptions = {
  chart: {
    type: 'line',
    height: 350,
  },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
  },
  colors: ['#8C57FF'],
}

const series = [{
  name: 'Sales',
  data: [30, 40, 35, 50, 49],
}]
</script>

<template>
  <VCard>
    <VCardTitle>Sales Chart</VCardTitle>
    <VCardText>
      <VueApexCharts
        type="line"
        :options="chartOptions"
        :series="series"
      />
    </VCardText>
  </VCard>
</template>
```

---

## Best Practices

### 1. Component Organization

#### ✅ DO:
```vue
<script setup lang="ts">
// 1. Imports (external libraries first)
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

// 2. Imports (internal)
import MyComponent from '@/components/MyComponent.vue'
import { myUtil } from '@/utils/helpers'

// 3. Props & Emits
interface Props {
  title: string
}
const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update', value: string): void
}>()

// 4. Reactive State
const count = ref(0)
const loading = ref(false)

// 5. Computed Properties
const doubleCount = computed(() => count.value * 2)

// 6. Methods
const increment = () => {
  count.value++
}

// 7. Lifecycle Hooks
onMounted(() => {
  console.log('Component mounted')
})
</script>

<template>
  <!-- Simple, clean template -->
</template>

<style lang="scss" scoped>
/* Component-specific styles */
</style>
```

### 2. TypeScript Usage

#### ✅ DO: Define Interfaces
```typescript
interface User {
  id: number
  name: string
  email: string
}

const users = ref<User[]>([])
```

#### ❌ DON'T: Use `any`
```typescript
// Bad
const data = ref<any>()

// Good
const data = ref<User>()
```

### 3. Composition API Patterns

#### ✅ DO: Create Composables for Reusable Logic
```typescript
// composables/useUsers.ts
export function useUsers() {
  const users = ref<User[]>([])
  const loading = ref(false)
  
  const fetchUsers = async () => {
    loading.value = true
    users.value = await api.getUsers()
    loading.value = false
  }
  
  onMounted(() => {
    fetchUsers()
  })
  
  return {
    users: readonly(users),
    loading: readonly(loading),
    fetchUsers,
  }
}
```

Usage:
```vue
<script setup lang="ts">
import { useUsers } from '@/composables/useUsers'

const { users, loading, fetchUsers } = useUsers()
</script>
```

### 4. Performance Optimization

#### Use `v-memo` for Expensive Lists
```vue
<template>
  <VList>
    <VListItem
      v-for="item in items"
      :key="item.id"
      v-memo="[item.id, item.status]"
    >
      <!-- Only re-renders if id or status changes -->
    </VListItem>
  </VList>
</template>
```

#### Lazy Load Components
```vue
<script setup lang="ts">
// Instead of direct import
// import HeavyComponent from './HeavyComponent.vue'

// Use defineAsyncComponent
const HeavyComponent = defineAsyncComponent(() =>
  import('./HeavyComponent.vue')
)
</script>
```

### 5. Error Handling

#### Global Error Handler
```typescript
// src/plugins/error-handler.ts
import type { App } from 'vue'

export default function (app: App) {
  app.config.errorHandler = (err, instance, info) => {
    console.error('Global error:', err)
    console.error('Component:', instance)
    console.error('Info:', info)
    
    // Send to error tracking service
    // trackError(err, { component: instance, info })
  }
}
```

#### Component-Level Error Handling
```vue
<script setup lang="ts">
const error = ref<string | null>(null)

const fetchData = async () => {
  try {
    error.value = null
    const data = await api.getData()
  } catch (err) {
    error.value = err.message || 'An error occurred'
  }
}
</script>

<template>
  <VAlert v-if="error" type="error">
    {{ error }}
  </VAlert>
</template>
```

### 6. Naming Conventions

#### Files
- **Components**: PascalCase - `UserProfile.vue`
- **Composables**: camelCase with `use` prefix - `useUsers.ts`
- **Utilities**: camelCase - `formatters.ts`
- **Types**: PascalCase - `User.ts`

#### Variables
- **Reactive State**: camelCase - `const userName = ref('')`
- **Constants**: UPPER_SNAKE_CASE - `const API_BASE_URL = '...'`
- **Computed**: camelCase - `const fullName = computed(() => ...)`

### 7. Component Props Best Practices

#### ✅ DO: Use TypeScript Interfaces
```typescript
interface Props {
  title: string
  count?: number
  isActive?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  isActive: false,
})
```

#### ✅ DO: Validate Props
```typescript
defineProps({
  status: {
    type: String as PropType<'active' | 'inactive' | 'pending'>,
    required: true,
    validator: (value: string) => ['active', 'inactive', 'pending'].includes(value),
  },
})
```

### 8. State Management Best Practices

#### Keep Store Logic Separate
```typescript
// ✅ Good: Actions handle logic
export const useUserStore = defineStore('user', () => {
  const users = ref<User[]>([])
  
  const fetchUsers = async () => {
    const data = await usersService.getAll()
    users.value = data
  }
  
  return { users, fetchUsers }
})

// ❌ Bad: Component handles logic
const users = ref([])
const data = await fetch('/api/users')
users.value = await data.json()
```

### 9. Testing Readiness

#### Write Testable Components
```vue
<script setup lang="ts">
// ✅ Good: Extracted logic, easy to test
const { users, loading, error, fetchUsers } = useUsers()
</script>
```

```typescript
// ✅ Can test useUsers separately
import { useUsers } from '@/composables/useUsers'

describe('useUsers', () => {
  it('fetches users', async () => {
    const { users, fetchUsers } = useUsers()
    await fetchUsers()
    expect(users.value.length).toBeGreaterThan(0)
  })
})
```

### 10. Code Splitting

#### Route-Level Splitting
```typescript
// ✅ Already done by default with dynamic imports
{
  path: 'dashboard',
  component: () => import('@/pages/dashboard.vue'),
}
```

#### Component-Level Splitting
```typescript
// For heavy components not immediately needed
const AdminPanel = defineAsyncComponent(() =>
  import('@/components/AdminPanel.vue')
)
```

---

## Summary

This project is a well-architected Vue 3 admin template with:

✅ **Modular Architecture** - Plugins, layouts, and components are separated  
✅ **Type Safety** - TypeScript throughout  
✅ **Auto-Imports** - Components and composables automatically available  
✅ **Flexible Layouts** - Easy to create custom layouts  
✅ **Dynamic Navigation** - Declarative navigation system  
✅ **Theme Support** - Built-in light/dark mode  
✅ **Performance** - Code splitting and lazy loading  
✅ **Extensible** - Easy to add new features  

### Quick Reference Commands

```bash
# Development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking
npm run typecheck

# Linting
npm run lint

# Build icons
npm run build:icons
```

### Folder Quick Access

| Purpose | Location |
|---------|----------|
| Add new page | `src/pages/` |
| Add route | `src/plugins/router/routes.ts` |
| Add navigation item | `src/layouts/components/NavItems.vue` |
| Create reusable component | `src/@core/components/` |
| Create layout | `src/layouts/` |
| Add plugin | `src/plugins/` |
| Configure theme | `src/plugins/vuetify/theme.ts` |
| Add utility function | `src/@core/utils/` |
| Create store | `src/stores/` |

---

## Questions or Issues?

For support, contact your TMN administrator.

---

**Last Updated**: November 2, 2025  
**Version**: 2.3.0  
**Framework**: Vue 3.5.13 + Vuetify 3.7.5

