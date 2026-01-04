# NFC Tags CRUD Implementation

## Overview

This document details the implementation of full CRUD (Create, Read, Update, Delete) operations for NFC Tags in the frontend application, integrating with the backend API.

**Date**: November 6, 2025  
**Status**: ✅ Complete

## Architecture Overview

The implementation follows the established 3-layer HTTP architecture:

```
┌─────────────────────────────────────────────────────────┐
│                     Components/Pages                     │
│  - nfc-tags.vue (List)                                  │
│  - nfc-tag-form.vue (Create/Edit Form)                  │
│  - ShortLinkNfcTags.vue (Component in Short Links)      │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Pinia Store Layer                     │
│  src/stores/nfcTag.ts                                   │
│  - State Management                                      │
│  - Business Logic                                        │
│  - Pagination                                            │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  HTTP Service Layer                      │
│  src/http/nfcTag.ts                                     │
│  - API Calls                                             │
│  - getNfcTags(), getNfcTagById()                        │
│  - createNfcTag(), updateNfcTag()                       │
│  - deleteNfcTagById()                                   │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                    Core HTTP Utility                     │
│  src/utils/http.ts                                      │
│  - getApi(), postApi(), putApi(), deleteApi()           │
│  - Cookie-based Authentication                           │
│  - Error Handling & Interceptors                        │
└─────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Type Definitions

**File**: `src/types/nfcTag.ts`

```typescript
export interface NfcTag {
  id: number
  uid: string
  short_link_id: number
  note: string
  created_by: number
  created_at: string
}

export interface NfcTagFormData {
  uid: string
  description?: string
  short_link_id: number | null
  note?: string
}

export interface NfcTagCreateData {
  uid: string
  short_link_id: number
  note?: string
}

export interface NfcTagUpdateData {
  short_link_id: number
  note?: string
}
```

**Key Points**:
- `NfcTag`: Main entity type matching backend response
- `NfcTagCreateData`: Data structure for creating new NFC tags
- `NfcTagUpdateData`: Data structure for updates (UID cannot be changed)
- `NfcTagFormData`: Form state type for the UI

### 2. HTTP Service Layer

**File**: `src/http/nfcTag.ts`

```typescript
import { deleteApi, getApi, postApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginatedResponse, PaginationParams } from '@/types/api'
import type { NfcTag, NfcTagCreateData, NfcTagUpdateData } from '@/types/nfcTag'

export function getNfcTags(params?: PaginationParams): Promise<PaginatedResponse<NfcTag>>
export function getNfcTagById(id: number): Promise<ApiResponse<NfcTag>>
export function createNfcTag(data: NfcTagCreateData): Promise<ApiResponse<NfcTag>>
export function updateNfcTag(id: number, data: NfcTagUpdateData): Promise<ApiResponse<NfcTag>>
export function deleteNfcTagById(id: number): Promise<ApiResponse<any>>
```

**API Endpoints** (from `src/config/api.ts`):
- `POST /nfc-tags` - Create new NFC tag
- `GET /nfc-tags` - List all NFC tags (with pagination)
- `GET /nfc-tags/:id` - Get specific NFC tag
- `PUT /nfc-tags/:id` - Update NFC tag (UID cannot be changed)
- `DELETE /nfc-tags/:id` - Delete NFC tag

### 3. Pinia Store

**File**: `src/stores/nfcTag.ts`

**State**:
```typescript
{
  nfcTags: NfcTag[]           // Array of NFC tags
  currentNfcTag: NfcTag | null  // Currently selected/edited tag
  isLoading: boolean          // Loading state
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}
```

**Getters**:
- `totalNfcTags`: Total count of NFC tags
- `hasMorePages`: Check if more pages available
- `nfcTagsSortedByCreatedAt`: NFC tags sorted by creation date

**Actions**:
- `fetchNfcTags(params?)`: Fetch paginated list
- `fetchNfcTagById(id)`: Fetch single NFC tag
- `createNfcTag(data)`: Create new NFC tag
- `updateNfcTag(id, data)`: Update existing NFC tag
- `deleteNfcTag(id)`: Delete NFC tag
- `clearCurrentNfcTag()`: Clear selected NFC tag
- `clearNfcTags()`: Clear all data

### 4. NFC Tags List Page

**File**: `src/pages/nfc-tags.vue`

**Features**:
- ✅ Paginated list of NFC tags
- ✅ Display UID with copy-to-clipboard functionality
- ✅ Show associated short link title
- ✅ Display note (or '-' if empty)
- ✅ Show creation date
- ✅ Edit and delete actions
- ✅ Loading state with spinner
- ✅ Pagination controls (page selector + items per page)
- ✅ Empty state message
- ✅ Error handling with snackbar feedback

**Key Functionality**:
```typescript
// Load NFC tags with pagination
const loadNfcTags = async () => {
  const skip = (currentPage.value - 1) * itemsPerPage.value
  await nfcTagStore.fetchNfcTags({
    take: itemsPerPage.value,
    skip: skip,
    orderBy: 'created_at',
    orderDirection: 'DESC',
  })
}

// Short link lookup for display
const getShortLinkTitle = (shortLinkId: number): string => {
  return shortLinkStore.shortLinks.find(sl => sl.id === shortLinkId)?.title || 'Unknown Short Link'
}

// Delete with confirmation
const handleDelete = async (id: number) => {
  if (!confirm('Are you sure?')) return
  await nfcTagStore.deleteNfcTag(id)
  await loadNfcTags() // Refresh list
}
```

### 5. NFC Tag Form Page

**File**: `src/pages/nfc-tag-form.vue`

**Features**:
- ✅ Create and edit modes
- ✅ UID field (read-only in edit mode - backend constraint)
- ✅ Short link selection with autocomplete
- ✅ Note field (optional)
- ✅ Short link pre-selection from query params
- ✅ Loading states during data fetch
- ✅ Error alerts for API failures
- ✅ Success snackbar with 1-second delay before redirect
- ✅ Form validation
- ✅ Submit button loading state

**Key Functionality**:
```typescript
// Load data on mount
onMounted(async () => {
  await shortLinkStore.fetchShortLinks() // For dropdown
  
  if (isEditMode.value) {
    await nfcTagStore.fetchNfcTagById(Number(nfcTagId.value))
    // Populate form with existing data
  } else if (preSelectedShortLinkId.value) {
    // Pre-select short link if navigating from short links page
    form.value.short_link_id = Number(preSelectedShortLinkId.value)
  }
})

// Submit handler
const handleSubmit = async () => {
  if (isEditMode.value) {
    // Note: UID cannot be updated per backend API
    await nfcTagStore.updateNfcTag(id, {
      short_link_id: form.value.short_link_id!,
      note: form.value.note,
    })
  } else {
    await nfcTagStore.createNfcTag({
      uid: form.value.uid,
      short_link_id: form.value.short_link_id!,
      note: form.value.note,
    })
  }
  
  // Show success message and redirect after delay
  snackbar.value = true
  setTimeout(() => router.push('/nfc-tags'), 1000)
}
```

**Form Fields**:
1. **UID** (required)
   - Read-only in edit mode
   - Hint: "Physical NFC tag serial number"
   - Example: "3323-43-4234-2"

2. **Short Link** (required)
   - Autocomplete dropdown
   - Shows title with code subtitle
   - Pre-selectable from navigation

3. **Note** (optional)
   - Textarea for description
   - Location information, etc.

### 6. ShortLinkNfcTags Component

**File**: `src/components/ShortLinkNfcTags.vue`

**Purpose**: Display NFC tags within short links dialog/page

**Features**:
- ✅ Filter NFC tags by short link ID
- ✅ Search functionality (UID, note)
- ✅ Inline table view
- ✅ Add new NFC tag button
- ✅ Edit and delete actions
- ✅ Copy UID functionality
- ✅ Loading state
- ✅ Empty state when no tags

**Integration**:
```typescript
// Filter tags for specific short link
const shortLinkNfcTags = computed(() => {
  return nfcTagStore.nfcTags.filter(tag => tag.short_link_id === props.shortLinkId)
})

// Navigate to form with pre-selected short link
const handleAddNew = () => {
  router.push({
    path: '/nfc-tag-form',
    query: { shortLinkId: props.shortLinkId.toString() },
  })
}
```

## API Integration

### Request/Response Examples

**Create NFC Tag**:
```http
POST /api/nfc-tags
Content-Type: application/json

{
  "uid": "3323-43-4234-2",
  "short_link_id": 1,
  "note": "Main entrance NFC tag"
}
```

**Response**:
```json
{
  "status": "OK",
  "code": 201,
  "data": {
    "id": 1,
    "uid": "3323-43-4234-2",
    "short_link_id": 1,
    "note": "Main entrance NFC tag",
    "created_by": 1,
    "created_at": "2025-11-06T12:00:00Z"
  }
}
```

**List NFC Tags** (Paginated):
```http
GET /api/nfc-tags?take=10&skip=0&orderBy=created_at&orderDirection=DESC
```

**Response**:
```json
{
  "status": "OK",
  "code": 200,
  "data": [
    {
      "id": 1,
      "uid": "3323-43-4234-2",
      "short_link_id": 1,
      "note": "Main entrance NFC tag",
      "created_by": 1,
      "created_at": "2025-11-06T12:00:00Z"
    }
  ],
  "extras": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 10,
    "total": 45
  }
}
```

**Update NFC Tag**:
```http
PUT /api/nfc-tags/1
Content-Type: application/json

{
  "short_link_id": 2,
  "note": "Updated note"
}
```

**Note**: UID cannot be updated per backend constraints.

## Key Features

### 1. Pagination
- Configurable items per page (5, 10, 25, 50)
- Page navigation with visible page numbers
- Display current range (e.g., "Showing 1 to 10 of 45")
- Maintains page state during navigation

### 2. Short Link Lookups
- Fetches all short links for name display
- Shows short link title instead of just ID
- Efficient client-side lookup via Pinia store

### 3. Pre-selection
- When navigating from short links page, short link is pre-selected
- URL query parameter: `?shortLinkId=1`
- Automatically sets form field

### 4. UID Immutability
- UID field is **read-only in edit mode**
- Backend constraint: UID cannot be changed after creation
- Clear hint text explains this to users

### 5. Loading States
- Spinner during API calls
- Disabled buttons during submission
- Loading indicator in component

### 6. Error Handling
- API errors displayed in alert banners
- Closeable error messages
- Snackbar for operation feedback
- Color-coded: success (green), error (red)

### 7. Success Feedback
- Snackbar notification after create/update/delete
- 1-second delay before redirect (to allow user to see message)
- Consistent messaging across all operations

### 8. Copy Functionality
- Quick copy UID to clipboard
- Feedback snackbar on success/failure
- Small icon button next to UID display

## File Structure

```
template-free/
├── src/
│   ├── types/
│   │   └── nfcTag.ts              # Type definitions
│   ├── http/
│   │   └── nfcTag.ts              # HTTP service
│   ├── stores/
│   │   └── nfcTag.ts              # Pinia store
│   ├── pages/
│   │   ├── nfc-tags.vue           # List page
│   │   └── nfc-tag-form.vue       # Form page
│   ├── components/
│   │   └── ShortLinkNfcTags.vue   # Component
│   ├── utils/
│   │   └── nfcTagHelpers.ts       # Utility functions
│   └── config/
│       └── api.ts                 # API endpoints config
└── NFC_TAGS_CRUD_IMPLEMENTATION.md # This file
```

## Testing Checklist

- [x] List NFC tags with pagination
- [x] Create new NFC tag
- [x] Edit existing NFC tag (UID is read-only)
- [x] Delete NFC tag with confirmation
- [x] Navigate from short links with pre-selected short link
- [x] View NFC tags in ShortLinkNfcTags component
- [x] Search/filter functionality (component)
- [x] Copy UID to clipboard
- [x] Error handling for API failures
- [x] Loading states during operations
- [x] Success notifications after create/update/delete
- [x] Pagination controls work correctly
- [x] Short link lookups display correctly
- [x] Form validation prevents invalid submissions
- [x] Empty states display appropriately

## Usage Examples

### Creating an NFC Tag

1. Navigate to `/nfc-tags`
2. Click "Add NFC Tag" button
3. Enter UID (e.g., "3323-43-4234-2")
4. Select short link from dropdown
5. Optionally add a note
6. Click "Create"
7. Success message appears
8. Redirects to list page

### Editing an NFC Tag

1. Navigate to `/nfc-tags`
2. Click edit icon on desired tag
3. UID field is read-only (cannot be changed)
4. Modify short link or note
5. Click "Update"
6. Success message appears
7. Redirects to list page

### Creating NFC Tag from Short Links

1. On short links page, click "View NFC Tags" for a short link
2. In the dialog, click "Add NFC Tag"
3. Short link is pre-selected
4. Enter UID and optional note
5. Click "Create"
6. Returns to short links page

### Pagination

1. Navigate to `/nfc-tags`
2. Select items per page from dropdown
3. Use pagination controls to navigate pages
4. Current range displayed below table

## Backend Constraints

### UID Cannot Be Updated
Per backend API documentation, the UID field is **immutable** after creation:

- Create: UID required in request
- Update: UID cannot be included/changed
- Frontend enforces this with read-only field in edit mode

### Validation Rules
- `uid`: Required, string
- `short_link_id`: Required, must reference existing short link
- `note`: Optional, string

## Related Documentation

- [Buildings CRUD Implementation](./BUILDINGS_CRUD_IMPLEMENTATION.md)
- [Packages CRUD Implementation](./PACKAGES_CRUD_IMPLEMENTATION.md)
- [Short Links CRUD Implementation](./SHORT_LINKS_CRUD_IMPLEMENTATION.md)
- [HTTP Architecture Analysis](./HTTP_ARCHITECTURE_ANALYSIS.md)
- [Backend API Documentation](../backend/API_DOCUMENTATION.md)

## Future Enhancements

Potential improvements for future iterations:

1. **Bulk Operations**: Select multiple NFC tags for bulk delete
2. **Advanced Filtering**: Filter by short link, date range, or note content
3. **QR Code Generation**: Generate QR codes for NFC tag UIDs
4. **Tag Status**: Track if tags are active/inactive
5. **Scan History**: Display scan history per NFC tag
6. **Import/Export**: Bulk import NFC tags from CSV
7. **Tag Groups**: Organize tags into logical groups

## Conclusion

The NFC Tags CRUD implementation is complete and follows the established patterns from Buildings, Packages, and Short Links implementations. The 3-layer architecture provides a clean separation of concerns, making the code maintainable and testable.

All CRUD operations are fully functional with:
- ✅ Proper error handling
- ✅ Loading states
- ✅ User feedback
- ✅ Pagination support
- ✅ Pre-selection capability
- ✅ Backend constraint compliance (UID immutability)

The implementation is ready for production use! 🎉

