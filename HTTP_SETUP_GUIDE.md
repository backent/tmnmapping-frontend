# HTTP Architecture - Quick Setup Guide

This guide will help you quickly set up and start using the new HTTP architecture in the template-free project.

## 🚀 Quick Start (5 minutes)

### 1. Configure Environment

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and set your API base URL:

```env
VITE_API_BASE_URL=http://localhost:3000
```

### 2. Restart Development Server

The `.env` changes require a server restart:

```bash
npm run dev
```

### 3. Test the Implementation

Open the application and try:
- Login page: `http://localhost:5173/login`
- Buildings page: `http://localhost:5173/buildings`

## 📁 What Was Implemented

### New Files Created

```
template-free/
├── .env.example                           ✅ Created
├── src/
│   ├── config/
│   │   └── api.ts                         ✅ Created - API endpoints
│   ├── types/
│   │   └── api.ts                         ✅ Created - Common types
│   ├── utils/
│   │   └── http.ts                        ✅ Created - Core HTTP utility
│   ├── http/
│   │   ├── auth.ts                        ✅ Created - Auth API service
│   │   └── building.ts                    ✅ Created - Building API service
│   └── stores/
│       ├── auth.ts                        ✅ Created - Auth store
│       └── building.ts                    ✅ Created - Building store
```

### Modified Files

```
├── env.d.ts                               ✅ Updated - Added env types
├── src/pages/
│   ├── login.vue                          ✅ Updated - Uses auth store
│   └── buildings.vue                      ✅ Updated - Uses building store
```

## 🔧 Backend API Requirements

Your backend needs to implement these endpoints:

### Authentication

```
POST   /api/login       - Login (sets HTTP-only cookie)
POST   /api/logout      - Logout (clears cookie)
GET    /api/me          - Get current user
```

### Buildings

```
GET    /api/buildings           - List buildings (with pagination)
GET    /api/buildings/:id       - Get single building
POST   /api/buildings           - Create building
PUT    /api/buildings/:id       - Update building
DELETE /api/buildings/:id       - Delete building
```

### Expected Response Format

**Success:**
```json
{
  "data": { /* your data */ },
  "message": "Success"
}
```

**Paginated:**
```json
{
  "data": [ /* array of items */ ],
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 10,
    "total": 50
  }
}
```

**Error:**
```json
{
  "message": "Error message",
  "errors": { /* validation errors */ }
}
```

## 🍪 Cookie Configuration

Your backend must set HTTP-only cookies on login:

**Express.js Example:**
```javascript
// Enable CORS with credentials
app.use(cors({
  origin: 'http://localhost:5173', // Your frontend URL
  credentials: true
}))

// Login endpoint
app.post('/api/login', (req, res) => {
  // ... authenticate user ...
  
  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  })
  
  res.json({
    data: {
      user: { id, name, email, role }
    }
  })
})
```

**Laravel Example:**
```php
// config/cors.php
return [
    'paths' => ['api/*'],
    'supports_credentials' => true,
    'allowed_origins' => ['http://localhost:5173'],
    // ...
];

// Login controller
public function login(Request $request)
{
    // ... authenticate user ...
    
    return response()->json([
        'data' => [
            'user' => $user
        ]
    ])->cookie('auth_token', $token, 1440, '/', null, true, true);
}
```

## 📝 Usage Examples

### In Your Components

**Fetch Data:**
```typescript
<script setup lang="ts">
import { useBuildingStore } from '@/stores/building'

const buildingStore = useBuildingStore()

onMounted(async () => {
  await buildingStore.fetchBuildings()
})

const buildings = computed(() => buildingStore.buildings)
const isLoading = computed(() => buildingStore.isLoading)
</script>

<template>
  <div v-if="isLoading">Loading...</div>
  <div v-else>
    <div v-for="building in buildings" :key="building.id">
      {{ building.name }}
    </div>
  </div>
</template>
```

**Create Item:**
```typescript
async function createBuilding() {
  try {
    await buildingStore.createBuilding({
      name: 'New Building',
      address: '123 Main St',
      description: 'A building'
    })
    console.log('Created successfully')
  } catch (error) {
    console.error('Failed:', error)
  }
}
```

**Login:**
```typescript
<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()

async function handleLogin() {
  try {
    await authStore.login({
      email: 'user@example.com',
      password: 'password'
    })
    router.push('/')
  } catch (error) {
    console.error('Login failed:', error)
  }
}
</script>
```

## 🎯 Adding More Entities

To add a new entity (e.g., packages), follow the buildings example:

1. **Add endpoints** to `src/config/api.ts`
2. **Create types** in `src/types/package.ts`
3. **Create HTTP service** in `src/http/package.ts`
4. **Create store** in `src/stores/package.ts`
5. **Use in components** via `usePackageStore()`

See the full documentation for detailed steps.

## 🐛 Troubleshooting

### "CORS error" in console

**Solution:** Your backend needs to enable CORS with credentials:
```javascript
cors({ credentials: true, origin: 'http://localhost:5173' })
```

### "401 Unauthorized" on every request

**Solution:** Check that:
1. Login is setting cookies correctly (check browser DevTools → Application → Cookies)
2. Backend validates cookies properly
3. CORS is configured to allow credentials

### "Network error" or "Failed to fetch"

**Solution:**
1. Verify `VITE_API_BASE_URL` in `.env` is correct
2. Restart dev server after changing `.env`
3. Check that backend is running

### TypeScript errors

**Solution:**
```bash
npm run typecheck
```

### Environment variables not working

**Solution:**
1. Restart dev server
2. Ensure variables start with `VITE_`
3. Check they're defined in `.env`

## 📚 Full Documentation

For complete documentation, see:
- `HTTP_ARCHITECTURE_DOCUMENTATION.md` - Comprehensive guide
- `HTTP_ARCHITECTURE_ANALYSIS.md` (from tif-cms) - Original pattern analysis

## ✅ Checklist

Before deploying to production:

- [ ] Set `VITE_API_BASE_URL` to production API URL
- [ ] Backend uses HTTPS (for secure cookies)
- [ ] Backend sets `Secure` flag on cookies
- [ ] CORS configured for production domain
- [ ] Environment variables properly set
- [ ] Error handling tested
- [ ] Authentication flow tested

## 🔐 Security Notes

1. **Cookies are HTTP-only** - JavaScript cannot access them (XSS protection)
2. **Use HTTPS in production** - Required for secure cookies
3. **SameSite=Strict** - CSRF protection
4. **Never expose sensitive data** - Backend should validate all requests
5. **Set appropriate cookie expiration** - Based on your security requirements

## 🎉 You're Ready!

The HTTP architecture is now fully implemented and ready to use. Start building your features using the stores and HTTP services!

For questions or issues, refer to the full documentation or open an issue.

---

**Quick Links:**
- Environment Setup: `.env.example`
- API Config: `src/config/api.ts`
- HTTP Utility: `src/utils/http.ts`
- Example Store: `src/stores/building.ts`
- Example Usage: `src/pages/buildings.vue`

