# HTTP Architecture Documentation - Template-Free

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Cookie-Based Authentication](#cookie-based-authentication)
4. [Implementation Details](#implementation-details)
5. [File Structure](#file-structure)
6. [Usage Examples](#usage-examples)
7. [API Integration Guide](#api-integration-guide)
8. [Best Practices](#best-practices)
9. [Migration from TIF-CMS](#migration-from-tif-cms)

---

## Overview

This project implements a robust, type-safe HTTP request architecture using TypeScript, Pinia stores, and cookie-based authentication. The architecture is inspired by the TIF-CMS pattern but enhanced with TypeScript types and modern security practices.

### Key Features
- **TypeScript**: Full type safety across all layers
- **Cookie-Based Authentication**: Secure HTTP-only cookies instead of localStorage
- **Pinia State Management**: Centralized state with actions and getters
- **Environment Variables**: Configurable API endpoints via Vite env vars
- **Error Handling**: Consistent error handling with user-friendly messages
- **Loading States**: Built-in loading indicators
- **Progress Tracking**: File upload progress support

---

## Architecture

The architecture follows a three-layer pattern:

```
┌─────────────────────────────────────┐
│         Vue Components              │
│      (Pages/Components)             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│       Pinia Stores                  │
│   (stores/auth.ts, building.ts)     │
│   - State management                │
│   - Business logic                  │
│   - Data transformation             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│     HTTP Services                   │
│   (http/auth.ts, building.ts)       │
│   - Domain-specific API calls       │
│   - Type definitions                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│    Core HTTP Utility                │
│    (utils/http.ts)                  │
│   - Request building                │
│   - Cookie authentication           │
│   - Error interception              │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│      Backend API                    │
│   (Environment configured)          │
└─────────────────────────────────────┘
```

---

## Cookie-Based Authentication

### Why Cookies?

Cookies provide better security than localStorage for authentication tokens:

1. **HTTP-Only**: Cookies can be marked as HTTP-only, preventing JavaScript access and XSS attacks
2. **Secure Flag**: Can be transmitted only over HTTPS
3. **SameSite**: Protection against CSRF attacks
4. **Automatic**: Browser automatically includes cookies in requests

### Implementation

All HTTP requests use `credentials: 'include'` to send cookies:

```typescript
fetch(url, {
  credentials: 'include',
  headers: defaultHeaders
})
```

### Backend Requirements

Your backend API should:

1. Set HTTP-only cookies on successful login:
```http
Set-Cookie: auth_token=<token>; HttpOnly; Secure; SameSite=Strict; Path=/
```

2. Validate cookies on protected endpoints
3. Clear cookies on logout
4. Configure CORS to allow credentials:
```javascript
// Express.js example
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true
}))
```

---

## Implementation Details

### 1. Environment Configuration

**Files:**
- `.env.example` - Template for environment variables
- `env.d.ts` - TypeScript definitions for environment variables

**Setup:**
```bash
# Create .env file from example
cp .env.example .env

# Configure your API URL
VITE_API_BASE_URL=http://localhost:3000
```

**TypeScript Support:**
```typescript
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
}
```

### 2. Type Definitions (`src/types/api.ts`)

Common API types used throughout the application:

```typescript
// Standard API response wrapper
interface ApiResponse<T> {
  data: T
  message?: string
  status?: string
}

// Paginated response for list endpoints
interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

// Error structure
interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status?: number
  statusText?: string
}
```

### 3. API Configuration (`src/config/api.ts`)

Centralized endpoint configuration:

```typescript
export const apiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || '',
  endpoints: {
    // Authentication
    auth_login: '/api/login',
    auth_logout: '/api/logout',
    auth_me: '/api/me',
    
    // Buildings
    get_buildings: '/api/buildings',
    get_building_by_id: '/api/buildings/:id',
    create_building: '/api/buildings',
    update_building: '/api/buildings/:id',
    delete_building: '/api/buildings/:id',
    
    // Add more endpoints as needed...
  },
}
```

### 4. Core HTTP Utility (`src/utils/http.ts`)

Provides six main functions:

#### `getApi<T>(url, params, body)`
```typescript
const buildings = await getApi<ApiResponse<Building[]>>(
  '/api/buildings',
  { page: 1, limit: 10 }
)
```

#### `postApi<T>(url, body, params)`
```typescript
const result = await postApi<ApiResponse<Building>>(
  '/api/buildings',
  { name: 'New Building', address: '123 Main St' }
)
```

#### `putApi<T>(url, body, params)`
```typescript
const result = await putApi<ApiResponse<Building>>(
  '/api/buildings/:id',
  { name: 'Updated Name' },
  { id: 123 }
)
```

#### `deleteApi<T>(url, body, params)`
```typescript
await deleteApi('/api/buildings/:id', {}, { id: 123 })
```

#### `postFormApi<T>(url, formData, params)`
```typescript
const formData = new FormData()
formData.append('image', file)
await postFormApi('/api/buildings', formData)
```

#### `postFormApiWithProgress<T>(url, formData, params, onProgress)`
```typescript
await postFormApiWithProgress(
  '/api/buildings',
  formData,
  {},
  (percent) => console.log(`Upload: ${percent}%`)
)
```

### 5. HTTP Services

Domain-specific API functions with proper typing.

**Example: `src/http/building.ts`**
```typescript
export function getBuildings(params?: PaginationParams): Promise<PaginatedResponse<Building>> {
  return getApi<PaginatedResponse<Building>>(apiConfig.endpoints.get_buildings, params || {})
}

export function getBuildingById(id: number): Promise<ApiResponse<Building>> {
  return getApi<ApiResponse<Building>>(apiConfig.endpoints.get_building_by_id, {}, { id })
}

export function postBuilding(data: BuildingCreateData): Promise<ApiResponse<Building>> {
  return postApi<ApiResponse<Building>>(apiConfig.endpoints.create_building, data)
}
```

### 6. Pinia Stores

State management with actions, getters, and computed properties.

**Example: `src/stores/building.ts`**
```typescript
export const useBuildingStore = defineStore('building', {
  state: (): BuildingState => ({
    buildings: [],
    currentBuilding: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  getters: {
    totalBuildings: (state) => state.pagination.total,
    hasMorePages: (state) => state.pagination.currentPage < state.pagination.lastPage,
  },

  actions: {
    async fetchBuildings(params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getBuildings(params)
        this.buildings = response.data
        this.pagination = { /* ... */ }
        return response
      } finally {
        this.isLoading = false
      }
    },
    // More actions...
  },
})
```

---

## File Structure

```
template-free/
├── .env.example                      # Environment template
├── env.d.ts                          # TypeScript env definitions
│
├── src/
│   ├── config/
│   │   └── api.ts                    # API endpoint configuration
│   │
│   ├── types/
│   │   ├── api.ts                    # Common API types
│   │   └── building.ts               # Building entity types
│   │
│   ├── utils/
│   │   └── http.ts                   # Core HTTP utility
│   │
│   ├── http/
│   │   ├── auth.ts                   # Auth HTTP service
│   │   └── building.ts               # Building HTTP service
│   │
│   ├── stores/
│   │   ├── auth.ts                   # Auth Pinia store
│   │   └── building.ts               # Building Pinia store
│   │
│   └── pages/
│       ├── login.vue                 # Login page (uses auth store)
│       └── buildings.vue             # Buildings page (uses building store)
```

---

## Usage Examples

### Basic CRUD Operations

#### Fetch List with Pagination
```typescript
const buildingStore = useBuildingStore()

// Fetch buildings
await buildingStore.fetchBuildings({
  page: 1,
  per_page: 10,
  search: 'tower'
})

// Access buildings
const buildings = computed(() => buildingStore.buildings)
const totalCount = computed(() => buildingStore.totalBuildings)
```

#### Get Single Item
```typescript
const buildingStore = useBuildingStore()
await buildingStore.fetchBuildingById(123)

// Access current building
const building = computed(() => buildingStore.currentBuilding)
```

#### Create New Item
```typescript
const buildingStore = useBuildingStore()

try {
  await buildingStore.createBuilding({
    name: 'Empire State Building',
    address: '20 W 34th St, New York',
    latitude: 40.748817,
    longitude: -73.985428,
    description: 'Iconic skyscraper'
  })
  console.log('Building created successfully')
} catch (error) {
  console.error('Failed to create building:', error)
}
```

#### Update Item
```typescript
const buildingStore = useBuildingStore()

await buildingStore.updateBuilding(123, {
  id: 123,
  name: 'Updated Name',
  address: 'Updated Address',
  // ... other fields
})
```

#### Delete Item
```typescript
const buildingStore = useBuildingStore()

if (confirm('Are you sure?')) {
  await buildingStore.deleteBuilding(123)
}
```

### Authentication

#### Login
```typescript
const authStore = useAuthStore()
const router = useRouter()

try {
  await authStore.login({
    email: 'user@example.com',
    password: 'password123',
    remember: true
  })
  
  // Redirect on success
  router.push('/')
} catch (error) {
  console.error('Login failed:', error)
}
```

#### Get Current User
```typescript
const authStore = useAuthStore()

// Fetch current user
await authStore.fetchCurrentUser()

// Access user data
const user = computed(() => authStore.currentUser)
const userName = computed(() => authStore.userName)
const isAdmin = computed(() => authStore.isAdmin)
```

#### Logout
```typescript
const authStore = useAuthStore()
const router = useRouter()

await authStore.logout()
router.push('/login')
```

### Loading States
```typescript
<script setup lang="ts">
const buildingStore = useBuildingStore()
const isLoading = computed(() => buildingStore.isLoading)
</script>

<template>
  <div v-if="isLoading">
    <VProgressCircular indeterminate />
  </div>
  <div v-else>
    <!-- Content -->
  </div>
</template>
```

### Error Handling
```typescript
const errorMessage = ref('')

async function loadBuildings() {
  try {
    await buildingStore.fetchBuildings()
  } catch (error: any) {
    errorMessage.value = error?.details?.message || 'Failed to load buildings'
  }
}
```

---

## API Integration Guide

### Backend API Expected Format

#### Success Response
```json
{
  "data": {
    "id": 1,
    "name": "Building Name",
    "address": "123 Main St"
  },
  "message": "Success"
}
```

#### Paginated Response
```json
{
  "data": [
    { "id": 1, "name": "Building 1" },
    { "id": 2, "name": "Building 2" }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 10,
    "total": 50
  },
  "links": {
    "first": "/api/buildings?page=1",
    "last": "/api/buildings?page=5",
    "prev": null,
    "next": "/api/buildings?page=2"
  }
}
```

#### Error Response
```json
{
  "message": "Validation failed",
  "errors": {
    "name": ["The name field is required"],
    "email": ["The email must be a valid email address"]
  }
}
```

### Authentication Flow

1. **Login Request**
```http
POST /api/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "remember": true
}
```

2. **Login Response** (sets HTTP-only cookie)
```http
HTTP/1.1 200 OK
Set-Cookie: auth_token=xyz123; HttpOnly; Secure; SameSite=Strict; Path=/
Content-Type: application/json

{
  "data": {
    "user": {
      "id": 1,
      "name": "John Doe",
      "email": "user@example.com",
      "role": "admin"
    }
  },
  "message": "Login successful"
}
```

3. **Authenticated Requests** (cookie sent automatically)
```http
GET /api/buildings
Cookie: auth_token=xyz123
```

4. **Logout Request**
```http
POST /api/logout
Cookie: auth_token=xyz123
```

5. **Logout Response** (clears cookie)
```http
HTTP/1.1 200 OK
Set-Cookie: auth_token=; Max-Age=0; Path=/

{
  "message": "Logged out successfully"
}
```

---

## Best Practices

### 1. Always Use Stores in Components

❌ **Don't** call HTTP services directly:
```typescript
import { getBuildings } from '@/http/building'

const buildings = await getBuildings() // Bad
```

✅ **Do** use stores:
```typescript
const buildingStore = useBuildingStore()
await buildingStore.fetchBuildings() // Good
```

### 2. Handle Errors Consistently

```typescript
async function performAction() {
  try {
    await store.someAction()
    showSuccessMessage('Action completed')
  } catch (error: any) {
    showErrorMessage(error?.details?.message || 'Action failed')
  }
}
```

### 3. Use Loading States

```typescript
const isLoading = computed(() => store.isLoading)

// In template
<VBtn :loading="isLoading" :disabled="isLoading">
  Submit
</VBtn>
```

### 4. Type Everything

```typescript
// Define interfaces for your data
interface Building {
  id: number
  name: string
  address: string
}

// Use them in your stores
const buildings = ref<Building[]>([])
```

### 5. Environment Variables

Never hardcode API URLs:

❌ **Bad:**
```typescript
const API_URL = 'http://localhost:3000'
```

✅ **Good:**
```typescript
const API_URL = import.meta.env.VITE_API_BASE_URL
```

### 6. Error Messages

Provide user-friendly error messages:

```typescript
catch (error: any) {
  const message = error?.details?.message || 'An unexpected error occurred'
  showError(message)
}
```

---

## Migration from TIF-CMS

### Key Differences

| Aspect | TIF-CMS | Template-Free |
|--------|---------|---------------|
| Language | JavaScript | TypeScript |
| Authentication | localStorage token | HTTP-only cookies |
| Environment | Nuxt | Vite |
| Build Tool | Nuxt | Vite |
| Auto-imports | Nuxt auto-imports | Unplugin auto-import |

### Migration Steps

1. **Convert JavaScript to TypeScript**
   - Add type annotations
   - Create interface definitions
   - Use generic types for API responses

2. **Update Authentication**
   - Remove localStorage token handling
   - Add `credentials: 'include'` to fetch calls
   - Update backend to use cookies

3. **Update Environment Variables**
   - Change from Nuxt runtime config to Vite env vars
   - Prefix with `VITE_`
   - Access via `import.meta.env`

4. **Update Import Paths**
   - Change `~/utils/http.js` to `@/utils/http.ts`
   - Update all file extensions from `.js` to `.ts`

5. **Add Type Definitions**
   - Create `types/api.ts` for common types
   - Add entity-specific types in `types/` folder

---

## Extending the Architecture

### Adding a New Entity (e.g., Packages)

1. **Create Types** (`src/types/package.ts`)
```typescript
export interface Package {
  id: number
  name: string
  buildingId: number
  // ... other fields
}
```

2. **Add Endpoints** (`src/config/api.ts`)
```typescript
get_packages: '/api/packages',
get_package_by_id: '/api/packages/:id',
create_package: '/api/packages',
update_package: '/api/packages/:id',
delete_package: '/api/packages/:id',
```

3. **Create HTTP Service** (`src/http/package.ts`)
```typescript
export function getPackages(params?: PaginationParams): Promise<PaginatedResponse<Package>> {
  return getApi<PaginatedResponse<Package>>(apiConfig.endpoints.get_packages, params || {})
}
// ... more functions
```

4. **Create Store** (`src/stores/package.ts`)
```typescript
export const usePackageStore = defineStore('package', {
  state: () => ({
    packages: [],
    currentPackage: null,
    isLoading: false,
  }),
  actions: {
    async fetchPackages(params?: PaginationParams) { /* ... */ },
    async fetchPackageById(id: number) { /* ... */ },
    // ... more actions
  },
})
```

5. **Use in Components**
```typescript
const packageStore = usePackageStore()
await packageStore.fetchPackages()
```

---

## Troubleshooting

### CORS Errors

If you see CORS errors:

1. Ensure backend allows credentials:
```javascript
cors({ credentials: true, origin: 'http://localhost:5173' })
```

2. Check that frontend uses correct URL in `.env`

### Authentication Not Working

1. Verify cookies are being set in browser DevTools
2. Check cookie flags (HttpOnly, Secure, SameSite)
3. Ensure `credentials: 'include'` is set in all requests

### Type Errors

1. Run TypeScript check: `npm run typecheck`
2. Ensure all imports use correct paths
3. Add missing type definitions

### Environment Variables Not Loading

1. Restart dev server after changing `.env`
2. Ensure variables are prefixed with `VITE_`
3. Check `env.d.ts` has correct interface

---

## Summary

This HTTP architecture provides:

- ✅ **Type Safety**: Full TypeScript coverage
- ✅ **Security**: Cookie-based authentication
- ✅ **Maintainability**: Clean separation of concerns
- ✅ **Scalability**: Easy to add new entities
- ✅ **Developer Experience**: Auto-complete and type checking
- ✅ **Error Handling**: Consistent error management
- ✅ **State Management**: Centralized with Pinia

The architecture is production-ready and follows Vue 3 and TypeScript best practices.

---

**Last Updated:** November 6, 2025  
**Project:** Template-Free  
**Architecture Version:** 1.0

