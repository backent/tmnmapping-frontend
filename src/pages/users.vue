<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABELS, SALES_GROUP_LABELS } from '@/config/roles'
import type { SalesGroup } from '@/config/roles'
import type { ManagedUser } from '@/types/user'
import type { PaginationParams } from '@/types/api'

const router = useRouter()
const userStore = useUserStore()
const authStore = useAuthStore()

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const currentPage = ref(1)
const itemsPerPage = ref(10)

// Search state
const searchQuery = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Delete dialog state
const deleteDialog = ref(false)
const itemToDelete = ref<ManagedUser | null>(null)

const items = computed(() => userStore.items)
const isLoading = computed(() => userStore.isLoading)
const totalRecords = computed(() => userStore.pagination.total)
const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value) || 1)

// The backend refuses to delete your own account; hide the button rather than
// letting the request fail.
const isSelf = (item: ManagedUser) => item.id === authStore.currentUser?.id

const roleLabel = (role: ManagedUser['role']) => ROLE_LABELS[role] ?? role

const salesGroupLabel = (group: ManagedUser['sales_group']) =>
  group ? SALES_GROUP_LABELS[group as SalesGroup] ?? group : '—'

const fetchItems = async () => {
  try {
    const skip = (currentPage.value - 1) * itemsPerPage.value

    const params: PaginationParams & { search?: string } = {
      take: itemsPerPage.value,
      skip,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    }

    if (searchQuery.value.trim())
      params.search = searchQuery.value.trim()

    await userStore.fetchList(params)
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to load users'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

// Debounced search
const handleSearch = () => {
  if (searchTimeout)
    clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchItems()
  }, 300)
}

onMounted(async () => {
  await fetchItems()
})

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchItems()
}

const handleItemsPerPageChange = async () => {
  currentPage.value = 1
  await fetchItems()
}

const handleEdit = (item: ManagedUser) => {
  router.push({ name: 'user-edit', params: { id: item.id.toString() } })
}

const confirmDelete = (item: ManagedUser) => {
  itemToDelete.value = item
  deleteDialog.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value)
    return
  try {
    await userStore.deleteItem(itemToDelete.value.id)
    snackbarMessage.value = 'User deleted successfully'
    snackbarColor.value = 'success'
    snackbar.value = true
    deleteDialog.value = false
    itemToDelete.value = null
    await fetchItems()
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to delete user'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

const handleCreate = () => {
  router.push({ name: 'user-new' })
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Users</span>
          <VBtn
            color="primary"
            @click="handleCreate"
          >
            <VIcon
              icon="ri-add-line"
              class="me-1"
            />
            Create User
          </VBtn>
        </VCardTitle>

        <VCardText>
          <!-- Search -->
          <VTextField
            v-model="searchQuery"
            label="Search by username, name or email"
            placeholder="Type to search..."
            prepend-inner-icon="ri-search-line"
            variant="outlined"
            density="compact"
            clearable
            class="mb-4"
            style="max-width: 400px"
            @input="handleSearch"
            @click:clear="searchQuery = ''; handleSearch()"
          />

          <div
            v-if="isLoading"
            class="d-flex justify-center align-center py-8"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
          </div>

          <div v-else>
            <VTable>
              <thead>
                <tr>
                  <th class="text-uppercase">
                    Username
                  </th>
                  <th class="text-uppercase">
                    Name
                  </th>
                  <th class="text-uppercase">
                    Email
                  </th>
                  <th class="text-uppercase">
                    Role
                  </th>
                  <th class="text-uppercase">
                    Quotations
                  </th>
                  <th class="text-uppercase">
                    Sales Group
                  </th>
                  <th class="text-uppercase text-center">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="item in items"
                  :key="item.id"
                >
                  <td>
                    <span class="font-weight-medium">{{ item.username }}</span>
                    <VChip
                      v-if="isSelf(item)"
                      size="x-small"
                      color="primary"
                      class="ms-2"
                    >
                      You
                    </VChip>
                  </td>
                  <td>{{ item.name }}</td>
                  <td>
                    <span class="text-body-2">{{ item.email || '—' }}</span>
                  </td>
                  <td>
                    <!-- Label, not colour alone: the role must stay readable
                         without relying on the chip colour. -->
                    <VChip
                      size="small"
                      :color="item.role === 'admin' ? 'primary' : 'secondary'"
                      variant="tonal"
                    >
                      {{ roleLabel(item.role) }}
                    </VChip>
                  </td>
                  <td>
                    <VIcon
                      v-if="item.can_create_quotations"
                      icon="ri-check-line"
                      color="success"
                    />
                    <span
                      v-else
                      class="text-disabled"
                    >—</span>
                  </td>
                  <td>
                    <span class="text-body-2">{{ salesGroupLabel(item.sales_group) }}</span>
                  </td>
                  <td class="text-center">
                    <VBtn
                      icon
                      size="small"
                      color="primary"
                      variant="text"
                      @click="handleEdit(item)"
                    >
                      <VIcon icon="ri-edit-line" />
                      <VTooltip
                        activator="parent"
                        location="top"
                      >
                        Edit
                      </VTooltip>
                    </VBtn>
                    <VBtn
                      v-if="!isSelf(item)"
                      icon
                      size="small"
                      color="error"
                      variant="text"
                      @click="confirmDelete(item)"
                    >
                      <VIcon icon="ri-delete-bin-line" />
                      <VTooltip
                        activator="parent"
                        location="top"
                      >
                        Delete
                      </VTooltip>
                    </VBtn>
                  </td>
                </tr>
                <tr v-if="items.length === 0">
                  <td
                    colspan="7"
                    class="text-center text-disabled py-8"
                  >
                    No users found. Click "Create User" to add one.
                  </td>
                </tr>
              </tbody>
            </VTable>

            <div
              v-if="totalRecords > 0"
              class="d-flex justify-space-between align-center mt-4"
            >
              <div class="text-body-2">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to {{ Math.min(currentPage * itemsPerPage, totalRecords) }} of {{ totalRecords }} entries
              </div>
              <div class="d-flex align-center gap-2">
                <VSelect
                  v-model="itemsPerPage"
                  :items="[10, 25, 50, 100]"
                  label="Per page"
                  density="compact"
                  hide-details
                  style="max-width: 100px"
                  @update:model-value="handleItemsPerPageChange"
                />
                <VPagination
                  v-model="currentPage"
                  :length="totalPages"
                  :total-visible="5"
                  density="compact"
                  @update:model-value="handlePageChange"
                />
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Delete Confirmation Dialog -->
    <VDialog
      v-model="deleteDialog"
      max-width="400"
    >
      <VCard>
        <VCardTitle>Confirm Delete</VCardTitle>
        <VCardText>
          Are you sure you want to delete "<strong>{{ itemToDelete?.username }}</strong>"? This action cannot be undone.
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            @click="deleteDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            @click="handleDelete"
          >
            Delete
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </VRow>
</template>
