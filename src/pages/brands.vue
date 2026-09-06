<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAdvertiserBrandStore } from '@/stores/advertiser'
import { useAuthStore } from '@/stores/auth'
import ImportExportToolbar from '@/components/advertiser/ImportExportToolbar.vue'
import type { Brand } from '@/types/advertiser'
import type { PaginationParams } from '@/types/api'

const router = useRouter()
const store = useAdvertiserBrandStore()
const authStore = useAuthStore()

const canManage = computed(() => authStore.can('brands.manage'))

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const currentPage = ref(1)
const itemsPerPage = ref(10)
const searchQuery = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const deleteDialog = ref(false)
const itemToDelete = ref<Brand | null>(null)

const items = computed(() => store.items)
const isLoading = computed(() => store.isLoading)
const totalRecords = computed(() => store.pagination.total)
const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value) || 1)

const notify = (message: string, color: 'success' | 'error' = 'success') => {
  snackbarMessage.value = message
  snackbarColor.value = color
  snackbar.value = true
}

const errorText = (error: any, fallback: string) =>
  error?.details?.data || error?.details?.message || fallback

const fetchItems = async () => {
  try {
    const params: PaginationParams & { search?: string } = {
      take: itemsPerPage.value,
      skip: (currentPage.value - 1) * itemsPerPage.value,
      orderBy: 'created_at',
      orderDirection: 'DESC',
    }

    if (searchQuery.value.trim())
      params.search = searchQuery.value.trim()

    await store.fetchList(params)
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to load brands'), 'error')
  }
}

const handleSearch = () => {
  if (searchTimeout)
    clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchItems()
  }, 300)
}

onMounted(fetchItems)

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchItems()
}

const handleItemsPerPageChange = async () => {
  currentPage.value = 1
  await fetchItems()
}

const confirmDelete = (item: Brand) => {
  itemToDelete.value = item
  deleteDialog.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value)
    return
  try {
    await store.deleteItem(itemToDelete.value.id)
    notify('Brand deleted successfully')
    deleteDialog.value = false
    itemToDelete.value = null
    await fetchItems()
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to delete brand'), 'error')
  }
}

const handleTemplate = async () => {
  try {
    await store.downloadTemplate()
  }
  catch {
    notify('Failed to download the template', 'error')
  }
}

const handleExport = async () => {
  try {
    await store.exportFile(searchQuery.value.trim() || undefined)
  }
  catch {
    notify('Failed to export brands', 'error')
  }
}

const handleImport = async (file: File) => {
  try {
    const result = await store.importFile(file)

    if (result?.imported)
      await fetchItems()
  }
  catch (error: any) {
    notify(errorText(error, 'Failed to import brands'), 'error')
  }
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between flex-wrap gap-2">
          <span>Brands</span>
          <div class="d-flex gap-2 flex-wrap">
            <ImportExportToolbar
              entity-label="Brands"
              :busy="store.isFileBusy"
              :result="store.lastImport"
              :can-manage="canManage"
              @template="handleTemplate"
              @export="handleExport"
              @import="handleImport"
              @clear-result="store.clearImportResult()"
            />
            <VBtn
              v-if="canManage"
              color="primary"
              @click="router.push({ name: 'advertiser-brand-new' })"
            >
              <VIcon
                icon="ri-add-line"
                class="me-1"
              />
              Create Brand
            </VBtn>
          </div>
        </VCardTitle>

        <VCardText>
          <VTextField
            v-model="searchQuery"
            label="Search by code, brand, category or customer"
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
                    Code
                  </th>
                  <th class="text-uppercase">
                    Brand
                  </th>
                  <th class="text-uppercase">
                    Customer
                  </th>
                  <th class="text-uppercase">
                    Category
                  </th>
                  <th class="text-uppercase">
                    Status
                  </th>
                  <th
                    v-if="canManage"
                    class="text-uppercase text-center"
                  >
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
                    <span class="font-weight-medium">{{ item.code }}</span>
                  </td>
                  <td>{{ item.name }}</td>
                  <td>
                    <div class="text-body-2">
                      {{ item.customer_name }}
                    </div>
                    <div class="text-caption text-disabled">
                      {{ item.customer_code }}
                    </div>
                  </td>
                  <td>
                    <span class="text-body-2">{{ item.category || '—' }}</span>
                  </td>
                  <td>
                    <VChip
                      size="small"
                      :color="item.status === 'active' ? 'success' : 'secondary'"
                      variant="tonal"
                    >
                      {{ item.status === 'active' ? 'Active' : 'Inactive' }}
                    </VChip>
                  </td>
                  <td
                    v-if="canManage"
                    class="text-center"
                  >
                    <VBtn
                      icon
                      size="small"
                      color="primary"
                      variant="text"
                      @click="router.push({ name: 'advertiser-brand-edit', params: { id: item.id.toString() } })"
                    >
                      <VIcon icon="ri-edit-line" />
                    </VBtn>
                    <VBtn
                      icon
                      size="small"
                      color="error"
                      variant="text"
                      @click="confirmDelete(item)"
                    >
                      <VIcon icon="ri-delete-bin-line" />
                    </VBtn>
                  </td>
                </tr>
                <tr v-if="items.length === 0">
                  <td
                    :colspan="canManage ? 6 : 5"
                    class="text-center text-disabled py-8"
                  >
                    No brands yet. Upload customers first, then import brands.
                  </td>
                </tr>
              </tbody>
            </VTable>

            <div
              v-if="totalRecords > 0"
              class="d-flex justify-space-between align-center mt-4"
            >
              <div class="text-body-2">
                Showing {{ (currentPage - 1) * itemsPerPage + 1 }} to
                {{ Math.min(currentPage * itemsPerPage, totalRecords) }} of {{ totalRecords }} entries
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

    <VDialog
      v-model="deleteDialog"
      max-width="440"
    >
      <VCard>
        <VCardTitle>Confirm Delete</VCardTitle>
        <VCardText>
          Delete "<strong>{{ itemToDelete?.name }}</strong>"? This cannot be undone.
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
      :timeout="4000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </VRow>
</template>
