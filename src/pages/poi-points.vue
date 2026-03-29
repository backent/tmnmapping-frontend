<script setup lang="ts">
import { useRouter } from 'vue-router'
import { usePOIPointStore } from '@/stores/poipoint'
import type { POIPoint } from '@/types/poipoint'
import type { PaginationParams } from '@/types/api'

const router = useRouter()
const poiPointStore = usePOIPointStore()

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const currentPage = ref(1)
const itemsPerPage = ref(10)

const searchQuery = ref('')
let searchTimeout: ReturnType<typeof setTimeout> | null = null

const fileInput = ref<HTMLInputElement | null>(null)
const isImporting = ref(false)
const isExporting = ref(false)

// Delete confirmation dialog
const deleteDialog = ref(false)
const deleteTarget = ref<POIPoint | null>(null)
const deleteUsageBrands = ref<string[]>([])
const isCheckingUsage = ref(false)

// Brands dialog
const brandsDialog = ref(false)
const brandsDialogTitle = ref('')
const brandsDialogList = ref<{ id: number; brand: string }[]>([])
const brandsSearch = ref('')
const brandsPage = ref(1)
const brandsPerPage = ref(10)

const filteredBrands = computed(() => {
  const q = brandsSearch.value.trim().toLowerCase()
  if (!q) return brandsDialogList.value
  return brandsDialogList.value.filter(b => b.brand.toLowerCase().includes(q))
})

const brandsTotalPages = computed(() =>
  Math.ceil(filteredBrands.value.length / brandsPerPage.value) || 1,
)

const pagedBrands = computed(() => {
  const start = (brandsPage.value - 1) * brandsPerPage.value
  return filteredBrands.value.slice(start, start + brandsPerPage.value)
})

watch(brandsSearch, () => { brandsPage.value = 1 })

const openBrandsDialog = (point: POIPoint) => {
  brandsDialogTitle.value = point.poi_name
  brandsDialogList.value = point.pois || []
  brandsSearch.value = ''
  brandsPage.value = 1
  brandsDialog.value = true
}

const points = computed(() => poiPointStore.points)
const isLoading = computed(() => poiPointStore.isLoading)
const totalRecords = computed(() => poiPointStore.pagination.total)
const totalPages = computed(() => Math.ceil(totalRecords.value / itemsPerPage.value) || 1)

const fetchPoints = async () => {
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

    await poiPointStore.fetchPOIPoints(params)
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to load POI points'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

const handleSearch = () => {
  if (searchTimeout)
    clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchPoints()
  }, 300)
}

onMounted(async () => {
  await fetchPoints()
})

const handlePageChange = async (page: number) => {
  currentPage.value = page
  await fetchPoints()
}

const handleItemsPerPageChange = async () => {
  currentPage.value = 1
  await fetchPoints()
}

const handleEdit = (point: POIPoint) => {
  router.push({ name: 'poi-point-edit', params: { id: point.id.toString() } })
}

const handleDeleteClick = async (point: POIPoint) => {
  deleteTarget.value = point
  deleteUsageBrands.value = []
  isCheckingUsage.value = true
  deleteDialog.value = true

  try {
    const usage = await poiPointStore.fetchPOIPointUsage(point.id)
    deleteUsageBrands.value = usage.pois.map(p => p.brand)
  }
  catch {
    deleteUsageBrands.value = []
  }
  finally {
    isCheckingUsage.value = false
  }
}

const confirmDelete = async () => {
  if (!deleteTarget.value)
    return

  try {
    await poiPointStore.deletePOIPoint(deleteTarget.value.id)
    snackbarMessage.value = 'POI point deleted successfully'
    snackbarColor.value = 'success'
    snackbar.value = true
    deleteDialog.value = false
    deleteTarget.value = null
    await fetchPoints()
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to delete POI point'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

const handleCreate = () => {
  router.push({ name: 'poi-point-new' })
}

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
    const response = await poiPointStore.importPOIPoints(file)
    const count = response.data?.length || 0
    snackbarMessage.value = `Successfully imported ${count} POI point(s)`
    snackbarColor.value = 'success'
    snackbar.value = true
    currentPage.value = 1
    await fetchPoints()
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to import POI points'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
  finally {
    isImporting.value = false
    input.value = ''
  }
}

const handleExport = async () => {
  isExporting.value = true
  try {
    await poiPointStore.exportPOIPoints(searchQuery.value.trim() || undefined)
    snackbarMessage.value = 'Export downloaded successfully'
    snackbarColor.value = 'success'
    snackbar.value = true
  }
  catch (error: any) {
    snackbarMessage.value = error?.details?.message || error?.details || 'Failed to export POI points'
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
          <span>POI Points</span>
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
              Create Point
            </VBtn>
          </div>
        </VCardTitle>

        <VCardText>
          <VTextField
            v-model="searchQuery"
            label="Search by POI name"
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
                    POI Name
                  </th>
                  <th class="text-uppercase">
                    Address
                  </th>
                  <th class="text-uppercase">
                    Category
                  </th>
                  <th class="text-uppercase">
                    Mother Brand
                  </th>
                  <th class="text-uppercase">
                    Branch
                  </th>
                  <th class="text-uppercase">
                    Brands
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
                  v-for="point in points"
                  :key="point.id"
                >
                  <td>
                    <span class="font-weight-medium">{{ point.poi_name }}</span>
                  </td>
                  <td>
                    <span class="text-body-2">{{ point.address || '-' }}</span>
                  </td>
                  <td>
                    <span class="text-body-2">{{ point.category || '-' }}</span>
                  </td>
                  <td>
                    <span class="text-body-2">{{ point.mother_brand || '-' }}</span>
                  </td>
                  <td>
                    <span class="text-body-2">{{ point.branch || '-' }}</span>
                  </td>
                  <td>
                    <VChip
                      v-if="point.pois && point.pois.length > 0"
                      color="primary"
                      size="small"
                      style="cursor: pointer;"
                      @click="openBrandsDialog(point)"
                    >
                      {{ point.pois.length }} {{ point.pois.length === 1 ? 'brand' : 'brands' }}
                    </VChip>
                    <span
                      v-else
                      class="text-disabled"
                    >-</span>
                  </td>
                  <td>
                    <span class="text-body-2">{{ new Date(point.created_at).toLocaleString() }}</span>
                  </td>
                  <td class="text-center">
                    <VBtn
                      icon
                      size="small"
                      color="primary"
                      variant="text"
                      @click="handleEdit(point)"
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
                      @click="handleDeleteClick(point)"
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
                <tr v-if="points.length === 0">
                  <td
                    colspan="8"
                    class="text-center text-disabled py-8"
                  >
                    No POI points found. Click "Create Point" to add one.
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
      max-width="500"
    >
      <VCard>
        <VCardTitle>Delete POI Point</VCardTitle>
        <VDivider />
        <VCardText>
          <div v-if="isCheckingUsage" class="d-flex justify-center py-4">
            <VProgressCircular indeterminate color="primary" />
          </div>
          <div v-else>
            <p>
              Are you sure you want to delete "<strong>{{ deleteTarget?.poi_name }}</strong>"?
            </p>
            <VAlert
              v-if="deleteUsageBrands.length > 0"
              type="warning"
              class="mt-3"
            >
              <div class="mb-2">
                This point is currently used by the following brand(s):
              </div>
              <VChip
                v-for="brand in deleteUsageBrands"
                :key="brand"
                variant="outlined"
                size="small"
                class="me-1 mb-1"
              >
                {{ brand }}
              </VChip>
              <div class="mt-2">
                Deleting this point will remove it from all associated brands.
              </div>
            </VAlert>
          </div>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="outlined"
            @click="deleteDialog = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            :disabled="isCheckingUsage"
            @click="confirmDelete"
          >
            Delete
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>

    <!-- Brands Dialog -->
    <VDialog
      v-model="brandsDialog"
      max-width="500"
    >
      <VCard>
        <VCardTitle>Brands using "{{ brandsDialogTitle }}"</VCardTitle>
        <VDivider />
        <VCardText>
          <VTextField
            v-model="brandsSearch"
            label="Search brands"
            placeholder="Type to search..."
            prepend-inner-icon="ri-search-line"
            variant="outlined"
            density="compact"
            clearable
            class="mb-3"
            hide-details
            @click:clear="brandsSearch = ''"
          />

          <VTable density="compact">
            <thead>
              <tr>
                <th class="text-uppercase">
                  Brand
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="b in pagedBrands"
                :key="b.id"
              >
                <td>{{ b.brand }}</td>
              </tr>
              <tr v-if="pagedBrands.length === 0">
                <td class="text-center text-disabled py-4">
                  No brands found.
                </td>
              </tr>
            </tbody>
          </VTable>

          <div
            v-if="filteredBrands.length > 0"
            class="d-flex justify-space-between align-center mt-3"
          >
            <div class="text-body-2">
              Showing {{ (brandsPage - 1) * brandsPerPage + 1 }} to {{ Math.min(brandsPage * brandsPerPage, filteredBrands.length) }} of {{ filteredBrands.length }} brands
            </div>
            <VPagination
              v-model="brandsPage"
              :length="brandsTotalPages"
              :total-visible="5"
              density="compact"
            />
          </div>
        </VCardText>
        <VDivider />
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="outlined"
            @click="brandsDialog = false"
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
