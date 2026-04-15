<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSubCategoryStore } from '@/stores/subcategory'
import type { SubCategory } from '@/types/subcategory'
import type { PaginationParams } from '@/types/api'

const router = useRouter()
const subCategoryStore = useSubCategoryStore()

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const currentPage = ref(1)
const itemsPerPage = ref(10)

// Search state
const searchQuery = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null

// Import state
const fileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const isExporting = ref(false)

// Delete dialog state
const deleteDialog = ref(false)
const itemToDelete = ref<SubCategory | null>(null)

const items = computed(() => subCategoryStore.items)
const isLoading = computed(() => subCategoryStore.isLoading)
const totalRecords = computed(() => subCategoryStore.pagination.total)
const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value) || 1)

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

    await subCategoryStore.fetchList(params)
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to load sub-categories'
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

const handleEdit = (item: SubCategory) => {
  router.push({ name: 'sub-category-edit', params: { id: item.id.toString() } })
}

const confirmDelete = (item: SubCategory) => {
  itemToDelete.value = item
  deleteDialog.value = true
}

const handleDelete = async () => {
  if (!itemToDelete.value)
    return
  try {
    await subCategoryStore.deleteItem(itemToDelete.value.id)
    snackbarMessage.value = 'Sub-category deleted successfully'
    snackbarColor.value = 'success'
    snackbar.value = true
    deleteDialog.value = false
    itemToDelete.value = null
    await fetchItems()
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to delete sub-category'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

const handleCreate = () => {
  router.push({ name: 'sub-category-new' })
}

// Handle import
const handleImportClick = () => {
  fileInput.value?.click()
}

const handleFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file)
    return

  isImporting.value = true
  try {
    const response = await subCategoryStore.importFile(file)
    const count = response.data?.length || 0

    snackbarMessage.value = `Successfully imported ${count} sub-category(s)`
    snackbarColor.value = 'success'
    snackbar.value = true
    currentPage.value = 1
    await fetchItems()
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to import sub-categories'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
  finally {
    isImporting.value = false
    input.value = ''
  }
}

// Handle export
const handleExport = async () => {
  isExporting.value = true
  try {
    await subCategoryStore.exportFile(searchQuery.value.trim() || undefined)
    snackbarMessage.value = 'Export downloaded successfully'
    snackbarColor.value = 'success'
    snackbar.value = true
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to export sub-categories'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
  finally {
    isExporting.value = false
  }
}
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Sub Categories</span>
          <div class="d-flex gap-2">
            <VBtn
              color="secondary"
              variant="outlined"
              :loading="isExporting"
              @click="handleExport"
            >
              <VIcon
                icon="ri-download-line"
                class="me-1"
              />
              Export
            </VBtn>
            <VBtn
              color="secondary"
              variant="outlined"
              :loading="isImporting"
              @click="handleImportClick"
            >
              <VIcon
                icon="ri-upload-line"
                class="me-1"
              />
              Import
            </VBtn>
            <VBtn
              color="primary"
              @click="handleCreate"
            >
              <VIcon
                icon="ri-add-line"
                class="me-1"
              />
              Create Sub Category
            </VBtn>
          </div>
        </VCardTitle>

        <VCardText>
          <!-- Search -->
          <VTextField
            v-model="searchQuery"
            label="Search by name"
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

          <!-- Hidden file input for import -->
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx,.csv"
            style="display: none"
            @change="handleFileSelected"
          >

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
                    Name
                  </th>
                  <th class="text-uppercase">
                    Created At
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
                    <span class="font-weight-medium">{{ item.name }}</span>
                  </td>
                  <td>
                    <span class="text-body-2">{{ new Date(item.created_at).toLocaleString() }}</span>
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
                    colspan="3"
                    class="text-center text-disabled py-8"
                  >
                    No sub-categories found. Click "Create Sub Category" to add one.
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
          Are you sure you want to delete "<strong>{{ itemToDelete?.name }}</strong>"? This action cannot be undone.
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
