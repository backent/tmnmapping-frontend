<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useSalesPackageStore } from '@/stores/salespackage'
import type { SalesPackage } from '@/types/salespackage'
import type { PaginationParams } from '@/types/api'

const router = useRouter()
const salesPackageStore = useSalesPackageStore()

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

// Import duplicate error dialog
interface DuplicateRow {
  name: string
  building_name: string
  rows: number[]
}
const duplicateDialog = ref(false)
const duplicateRows = ref<DuplicateRow[]>([])

const packages = computed(() => salesPackageStore.packages)
const isLoading = computed(() => salesPackageStore.isLoading)
const totalRecords = computed(() => salesPackageStore.pagination.total)
const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value) || 1)

const fetchPackages = async () => {
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

    await salesPackageStore.fetchSalesPackages(params)
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to load sales packages'
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
    fetchPackages()
  }, 300)
}

onMounted(async () => {
  await fetchPackages()
})

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchPackages()
}

const handleItemsPerPageChange = async () => {
  currentPage.value = 1
  await fetchPackages()
}

const handleEdit = (pkg: SalesPackage) => {
  router.push({ name: 'sales-package-edit', params: { id: pkg.id.toString() } })
}

const handleDelete = async (pkg: SalesPackage) => {
  if (!confirm(`Are you sure you want to delete "${pkg.name}"?`))
    return
  try {
    await salesPackageStore.deleteSalesPackage(pkg.id)
    snackbarMessage.value = 'Sales package deleted successfully'
    snackbarColor.value = 'success'
    snackbar.value = true
    await fetchPackages()
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to delete sales package'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

const handleCreate = () => {
  router.push({ name: 'sales-package-new' })
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
    const response = await salesPackageStore.importSalesPackages(file)
    const count = response.data?.length || 0

    snackbarMessage.value = `Successfully imported ${count} sales package(s)`
    snackbarColor.value = 'success'
    snackbar.value = true
    currentPage.value = 1
    await fetchPackages()
  }
  catch (error: any) {
    const dupes = error?.details?.extras?.duplicates as DuplicateRow[] | undefined
    if (dupes && dupes.length > 0) {
      duplicateRows.value = dupes
      duplicateDialog.value = true
    }
    else {
      snackbarMessage.value = error?.details?.data || error?.details?.message || 'Failed to import sales packages'
      snackbarColor.value = 'error'
      snackbar.value = true
    }
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
    await salesPackageStore.exportSalesPackages(searchQuery.value.trim() || undefined)
    snackbarMessage.value = 'Export downloaded successfully'
    snackbarColor.value = 'success'
    snackbar.value = true
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to export sales packages'
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
          <span>Sales Packages</span>
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
              Create Sales Package
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
                    Buildings
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
                  v-for="pkg in packages"
                  :key="pkg.id"
                >
                  <td>
                    <span class="font-weight-medium">{{ pkg.name }}</span>
                  </td>
                  <td>
                    <VChip
                      color="primary"
                      size="small"
                    >
                      {{ pkg.buildings.length }} {{ pkg.buildings.length === 1 ? 'building' : 'buildings' }}
                    </VChip>
                  </td>
                  <td>
                    <span class="text-body-2">{{ new Date(pkg.created_at).toLocaleString() }}</span>
                  </td>
                  <td class="text-center">
                    <VBtn
                      icon
                      size="small"
                      color="primary"
                      variant="text"
                      @click="handleEdit(pkg)"
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
                      @click="handleDelete(pkg)"
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
                <tr v-if="packages.length === 0">
                  <td
                    colspan="4"
                    class="text-center text-disabled py-8"
                  >
                    No sales packages found. Click "Create Sales Package" to add one.
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

    <!-- Duplicate rows dialog (import validation) -->
    <VDialog
      v-model="duplicateDialog"
      max-width="720"
      scrollable
    >
      <VCard>
        <VCardTitle class="d-flex align-center gap-2">
          <VIcon
            icon="ri-error-warning-line"
            color="error"
          />
          <span>Import failed: duplicate rows</span>
        </VCardTitle>
        <VCardText>
          <p class="mb-4 text-body-2">
            The same sales package cannot reference the same building more than once. Please fix the rows below in your file and try again.
          </p>
          <VTable density="compact">
            <thead>
              <tr>
                <th class="text-uppercase">
                  Name
                </th>
                <th class="text-uppercase">
                  Building
                </th>
                <th class="text-uppercase">
                  Rows
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(dup, idx) in duplicateRows"
                :key="idx"
              >
                <td>{{ dup.name }}</td>
                <td>{{ dup.building_name || '-' }}</td>
                <td>{{ dup.rows.join(', ') }}</td>
              </tr>
            </tbody>
          </VTable>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            color="primary"
            @click="duplicateDialog = false"
          >
            Close
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
