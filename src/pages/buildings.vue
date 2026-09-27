<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import { useBuildingStore } from '@/stores/building'
import { useAuthStore } from '@/stores/auth'
import ImportExportToolbar from '@/components/advertiser/ImportExportToolbar.vue'
import {
  downloadBuildingTemplate,
  exportBuildings,
  importBuildings,
} from '@/http/building'
import type { ImportResult } from '@/types/advertiser'
import { BUILDING_TYPE_CODES } from '@/config/buildingType'
import type { Building } from '@/types/building'
import { extractApiError } from '@/utils/apiError'

const router = useRouter()
const route = useRoute()
const buildingStore = useBuildingStore()

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')
const authStore = useAuthStore()

// Helper function to parse query parameter
const parseQueryParam = (value: any, defaultValue: any, parser?: (val: string) => any): any => {
  if (value === null || value === undefined)
    return defaultValue

  const str = Array.isArray(value) ? value[0] : value

  if (!str || str === '')
    return defaultValue

  return parser ? parser(String(str)) : String(str)
}

// Helper function to parse query parameter as array (comma-separated)
const parseQueryParamArray = (value: any): string[] => {
  if (value === null || value === undefined)
    return []

  const str = Array.isArray(value) ? value[0] : value

  if (!str || str === '')
    return []

  return String(str).split(',').map(v => v.trim()).filter(v => v !== '')
}

// Initialize state from URL query parameters
const currentPage = ref(parseQueryParam(route.query.page, 1, val => Number.parseInt(val, 10)))
const itemsPerPage = ref(parseQueryParam(route.query.perPage, 10, val => Number.parseInt(val, 10)))

const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([
  {
    key: parseQueryParam(route.query.orderBy, 'created_at'),
    order: (parseQueryParam(route.query.orderDirection, 'desc') as string).toLowerCase() as 'asc' | 'desc',
  },
])

// Search state
const searchQuery = ref(parseQueryParam(route.query.search, ''))
const searchDebounce = ref<NodeJS.Timeout | null>(null)

// Filter state (multi-select: string arrays)
const filterBuildingStatus = ref<string[]>(parseQueryParamArray(route.query.building_status))
const filterSellable = ref<string[]>(parseQueryParamArray(route.query.sellable))
const filterConnectivity = ref<string[]>(parseQueryParamArray(route.query.connectivity))
const filterResourceType = ref<string[]>(parseQueryParamArray(route.query.resource_type))

const filterCompetitorLocation = ref<boolean | null>(
  route.query.competitor_location === undefined
    ? null
    : parseQueryParam(route.query.competitor_location, null, val => val === 'true'),
)

const filterCbdArea = ref<string[]>(parseQueryParamArray(route.query.cbd_area))
const filterSubdistrict = ref<string[]>(parseQueryParamArray(route.query.subdistrict))
const filterCitytown = ref<string[]>(parseQueryParamArray(route.query.citytown))
const filterProvince = ref<string[]>(parseQueryParamArray(route.query.province))
const filterGradeResource = ref<string[]>(parseQueryParamArray(route.query.grade_resource))
const filterBuildingType = ref<string[]>(parseQueryParamArray(route.query.building_type))

// Computed properties
const buildings = computed(() => buildingStore.buildings)
const isLoading = computed(() => buildingStore.isLoading)
const isSyncing = computed(() => buildingStore.isSyncing)

const totalRecords = computed(() => buildingStore.pagination.total)
const filterOptions = computed(() => buildingStore.filterOptions)

// Building type options: filter the canonical config to the names actually present
// in the DB (preserves prior "DB-driven visibility") while preserving config order
// so the dropdown matches the mapping page chip grid.
const buildingTypeOptions = computed(() => {
  const present = new Set(filterOptions.value?.building_type || [])

  return BUILDING_TYPE_CODES
    .filter(({ name }) => present.has(name))
    .map(({ name }) => name)
})

// Update URL query parameters
const updateURL = () => {
  const query: Record<string, string | number> = {}

  // Add pagination
  if (currentPage.value > 1)
    query.page = currentPage.value

  if (itemsPerPage.value !== 10)
    query.perPage = itemsPerPage.value

  // Add search
  if (searchQuery.value.trim())
    query.search = searchQuery.value.trim()

  // Add filters
  if (filterBuildingStatus.value.length > 0)
    query.building_status = filterBuildingStatus.value.join(',')

  if (filterSellable.value.length > 0)
    query.sellable = filterSellable.value.join(',')

  if (filterConnectivity.value.length > 0)
    query.connectivity = filterConnectivity.value.join(',')

  if (filterResourceType.value.length > 0)
    query.resource_type = filterResourceType.value.join(',')

  if (filterCompetitorLocation.value !== null)
    query.competitor_location = filterCompetitorLocation.value ? 'true' : 'false'

  if (filterCbdArea.value.length > 0)
    query.cbd_area = filterCbdArea.value.join(',')

  if (filterSubdistrict.value.length > 0)
    query.subdistrict = filterSubdistrict.value.join(',')

  if (filterCitytown.value.length > 0)
    query.citytown = filterCitytown.value.join(',')

  if (filterProvince.value.length > 0)
    query.province = filterProvince.value.join(',')

  if (filterGradeResource.value.length > 0)
    query.grade_resource = filterGradeResource.value.join(',')

  if (filterBuildingType.value.length > 0)
    query.building_type = filterBuildingType.value.join(',')

  // Add sorting
  if (sortBy.value.length > 0) {
    const sort = sortBy.value[0]

    if (sort.key !== 'created_at')
      query.orderBy = sort.key

    if (sort.order !== 'desc')
      query.orderDirection = sort.order === 'asc' ? 'ASC' : 'DESC'
  }

  // Update URL without adding to browser history
  router.push({ query, replace: true })
}

// Fetch buildings with pagination
const fetchBuildings = async () => {
  try {
    const skip = (currentPage.value - 1) * itemsPerPage.value

    const params: any = {
      take: itemsPerPage.value,
      skip,
    }

    // Add search if present
    if (searchQuery.value.trim())
      params.search = searchQuery.value.trim()

    // Add filters if present
    if (filterBuildingStatus.value.length > 0)
      params.building_status = filterBuildingStatus.value.join(',')

    if (filterSellable.value.length > 0)
      params.sellable = filterSellable.value.join(',')

    if (filterConnectivity.value.length > 0)
      params.connectivity = filterConnectivity.value.join(',')

    if (filterResourceType.value.length > 0)
      params.resource_type = filterResourceType.value.join(',')

    if (filterCompetitorLocation.value !== null)
      params.competitor_location = filterCompetitorLocation.value

    if (filterCbdArea.value.length > 0)
      params.cbd_area = filterCbdArea.value.join(',')

    if (filterSubdistrict.value.length > 0)
      params.subdistrict = filterSubdistrict.value.join(',')

    if (filterCitytown.value.length > 0)
      params.citytown = filterCitytown.value.join(',')

    if (filterProvince.value.length > 0)
      params.province = filterProvince.value.join(',')

    if (filterGradeResource.value.length > 0)
      params.grade_resource = filterGradeResource.value.join(',')

    if (filterBuildingType.value.length > 0)
      params.building_type = filterBuildingType.value.join(',')

    // Add sorting if present
    if (sortBy.value.length > 0) {
      const sort = sortBy.value[0]

      params.orderBy = sort.key
      params.orderDirection = sort.order === 'desc' ? 'DESC' : 'ASC'
    }

    await buildingStore.fetchBuildings(params)
  }
  catch (error: any) {
    snackbarMessage.value = error?.response?.data?.data || 'Failed to load buildings'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

// --- spreadsheet maintenance ------------------------------------------------
//
// A blank cell CLEARS on this import, unlike the price import where a blank leaves
// the value alone. That makes a partial upload destructive, so the preview leads
// with what it will empty and every change is recorded in the building's history.

const canManageBuildings = computed(() => authStore.can('buildings.manage'))

const isFileBusy = ref(false)
const lastImport = ref<ImportResult | null>(null)
const preview = ref<ImportResult | null>(null)
const pendingFile = ref<File | null>(null)
const previewDialog = ref(false)

const clearedCount = computed(() => preview.value?.cleared ?? 0)

const rejectedImport = (error: any): ImportResult | null => {
  const data = error?.details?.data

  return data && Array.isArray(data.errors) ? data as ImportResult : null
}

const notify = (message: string, isError = false) => {
  snackbarMessage.value = message
  snackbarColor.value = isError ? 'error' : 'success'
  snackbar.value = true
}

const handleImport = async (file: File) => {
  isFileBusy.value = true
  lastImport.value = null
  try {
    const response = await importBuildings(file, true)

    preview.value = response.data || null
    pendingFile.value = file
    previewDialog.value = true
  }
  catch (error: any) {
    const result = rejectedImport(error)
    if (result)
      lastImport.value = result
    else
      notify(extractApiError(error, 'Failed to read the file'), true)
  }
  finally {
    isFileBusy.value = false
  }
}

const cancelImport = () => {
  previewDialog.value = false
  pendingFile.value = null
  preview.value = null
}

const applyImport = async () => {
  if (!pendingFile.value)
    return

  isFileBusy.value = true
  try {
    const response = await importBuildings(pendingFile.value, false)
    const result = response.data
    const cleared = result?.cleared ?? 0

    cancelImport()
    await fetchBuildings()

    notify(`Buildings applied: ${result?.created ?? 0} new, ${result?.updated ?? 0} changed${
      cleared ? `, ${cleared} field${cleared === 1 ? '' : 's'} cleared.` : '.'}`)
  }
  catch (error: any) {
    const result = rejectedImport(error)

    cancelImport()
    if (result)
      lastImport.value = result
    else
      notify(extractApiError(error, 'Failed to apply the file'), true)
  }
  finally {
    isFileBusy.value = false
  }
}

const saveBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const handleExport = async () => {
  isFileBusy.value = true
  try {
    saveBlob(await exportBuildings(), `TMN_Buildings_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to export'), true)
  }
  finally {
    isFileBusy.value = false
  }
}

const handleTemplate = async () => {
  isFileBusy.value = true
  try {
    saveBlob(await downloadBuildingTemplate(), 'TMN_Buildings_Template.xlsx')
  }
  catch (error: any) {
    notify(extractApiError(error, 'Failed to download the template'), true)
  }
  finally {
    isFileBusy.value = false
  }
}

// Watch for pagination/sort changes
watch([currentPage, itemsPerPage, sortBy], () => {
  updateURL()
  fetchBuildings()
}, { deep: true })

// Watch for search changes with debounce
watch(searchQuery, () => {
  // Reset to first page when searching
  currentPage.value = 1

  // Clear existing timeout
  if (searchDebounce.value)
    clearTimeout(searchDebounce.value)

  // Debounce search - wait 500ms after user stops typing
  searchDebounce.value = setTimeout(() => {
    updateURL()
    fetchBuildings()
  }, 500)
})

// Watch for filter changes
watch([filterBuildingStatus, filterSellable, filterConnectivity, filterResourceType, filterCompetitorLocation, filterCbdArea, filterSubdistrict, filterCitytown, filterProvince, filterGradeResource, filterBuildingType], () => {
  // Reset to first page when filters change
  currentPage.value = 1
  updateURL()
  fetchBuildings()
})

const handleEdit = (building: Building) => {
  router.push({ name: 'building-edit', params: { id: building.id.toString() } })
}

const triggerSync = async () => {
  try {
    await buildingStore.triggerSync()
    snackbarMessage.value = 'Buildings synced successfully!'
    snackbarColor.value = 'success'
    snackbar.value = true

    // Refresh current page after sync
    await fetchBuildings()
  }
  catch (error: any) {
    snackbarMessage.value = error?.response?.data?.data || 'Failed to sync buildings'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
}

const formatDate = (dateString: string) => {
  if (!dateString)
    return '-'

  return new Date(dateString).toLocaleString()
}

const clearFilters = () => {
  filterBuildingStatus.value = []
  filterSellable.value = []
  filterConnectivity.value = []
  filterResourceType.value = []
  filterCompetitorLocation.value = null
  filterCbdArea.value = []
  filterSubdistrict.value = []
  filterCitytown.value = []
  filterProvince.value = []
  filterGradeResource.value = []
  filterBuildingType.value = []
  searchQuery.value = ''
  currentPage.value = 1
  updateURL()
  fetchBuildings()
}

onMounted(async () => {
  // Fetch filter options first
  await buildingStore.fetchFilterOptions()

  // Then fetch buildings
  await fetchBuildings()
})
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle class="d-flex align-center justify-space-between flex-wrap gap-2">
          <span>Buildings</span>
          <div class="d-flex align-center gap-2 flex-wrap">
            <ImportExportToolbar
              entity-label="Buildings"
              :busy="isFileBusy"
              :result="lastImport"
              :can-manage="canManageBuildings"
              @template="handleTemplate"
              @export="handleExport"
              @import="handleImport"
              @clear-result="lastImport = null"
            />
            <VBtn
              v-if="canManageBuildings"
              color="primary"
              prepend-icon="ri-add-line"
              @click="router.push('/buildings/new')"
            >
              New Building
            </VBtn>
            <VBtn
              color="secondary"
              :loading="isSyncing"
              :disabled="isSyncing"
              @click="triggerSync"
            >
              <VIcon
                icon="ri-refresh-line"
                class="me-1"
              />
              Sync from ERP
            </VBtn>
          </div>
        </VCardTitle>

        <VCardText>
          <!-- Filters -->
          <VRow class="mb-4">
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterBuildingStatus"
                :items="filterOptions?.building_status || []"
                label="Status"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterSellable"
                :items="filterOptions?.sellable || []"
                label="Sellable"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterConnectivity"
                :items="filterOptions?.connectivity || []"
                label="Connectivity"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterResourceType"
                :items="filterOptions?.resource_type || []"
                label="Resource Type"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterCompetitorLocation"
                :items="[
                  { title: 'All', value: null },
                  { title: 'Yes', value: true },
                  { title: 'No', value: false },
                ]"
                label="Competitor Location"
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterCbdArea"
                :items="filterOptions?.cbd_area || []"
                label="CBD Area"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterSubdistrict"
                :items="filterOptions?.subdistrict || []"
                label="Subdistrict"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterCitytown"
                :items="filterOptions?.citytown || []"
                label="City/Town"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterProvince"
                :items="filterOptions?.province || []"
                label="Province"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterGradeResource"
                :items="filterOptions?.grade_resource || []"
                label="Grade Resource"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VAutocomplete
                v-model="filterBuildingType"
                :items="buildingTypeOptions"
                label="Building Type"
                placeholder="All"
                multiple
                clearable
                density="compact"
                hide-details
              />
            </VCol>
          </VRow>

          <!-- Search and Clear Filters -->
          <VRow class="mb-4">
            <VCol
              cols="12"
              md="4"
            >
              <VTextField
                v-model="searchQuery"
                label="Search by name"
                placeholder="Enter building name..."
                prepend-inner-icon="ri-search-line"
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol
              cols="12"
              md="2"
            >
              <VBtn
                color="secondary"
                variant="outlined"
                block
                @click="clearFilters"
              >
                Clear Filters
              </VBtn>
            </VCol>
          </VRow>

          <!-- Loading State -->
          <div
            v-if="isLoading"
            class="d-flex justify-center align-center py-8"
          >
            <VProgressCircular
              indeterminate
              color="primary"
            />
          </div>

          <!-- Buildings Table -->
          <div v-else>
            <VTable>
              <thead>
                <tr>
                  <th
                    class="text-uppercase"
                    style="white-space: nowrap;"
                  >
                    Building ID
                  </th>
                  <th class="text-uppercase">
                    Name
                  </th>
                  <th class="text-uppercase">
                    Project
                  </th>
                  <th class="text-uppercase">
                    Audience
                  </th>
                  <th class="text-uppercase">
                    Impression
                  </th>
                  <th class="text-uppercase">
                    CBD Area
                  </th>
                  <th class="text-uppercase">
                    Status
                  </th>
                  <th class="text-uppercase">
                    Sellable
                  </th>
                  <th class="text-uppercase">
                    Connectivity
                  </th>
                  <th class="text-uppercase">
                    Synced At
                  </th>
                  <th class="text-uppercase text-center">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="building in buildings"
                  :key="building.id"
                >
                  <td style="white-space: nowrap;">
                    <code
                      v-if="building.external_building_id"
                      class="text-primary"
                    >{{ building.external_building_id }}</code>
                    <span
                      v-else
                      class="text-disabled"
                    >-</span>
                  </td>
                  <td>
                    <span class="font-weight-medium">{{ building.name }}</span>
                  </td>
                  <!--
                    OUR project -- the building_projects row this building is
                    linked to -- not buildings.project_name, which is ERP's own
                    text. Both used to be called "Project" and the column showed
                    the ERP one, so a building with no project link still appeared
                    to have a project.

                    project_name is still stored and still needed: /dashboard/loi
                    joins ERP letters to buildings on that text, and 1,730 of them
                    resolve their building type through it. It is just not this
                    column's business.
                  -->
                  <td>
                    <template v-if="building.project_display_name">
                      <span>{{ building.project_display_name }}</span>
                      <div class="text-caption text-disabled">
                        {{ building.project_id_iris }}
                      </div>
                    </template>
                    <span
                      v-else
                      class="text-disabled"
                    >Not linked</span>
                  </td>
                  <td>{{ building.audience || 0 }}</td>
                  <td>{{ building.impression || 0 }}</td>
                  <td>
                    <span v-if="building.cbd_area">{{ building.cbd_area }}</span>
                    <span
                      v-else
                      class="text-disabled"
                    >-</span>
                  </td>
                  <td>
                    <VChip
                      v-if="building.building_status"
                      color="primary"
                      size="small"
                    >
                      {{ building.building_status }}
                    </VChip>
                    <span
                      v-else
                      class="text-disabled"
                    >-</span>
                  </td>
                  <td>
                    <VChip
                      v-if="building.sellable"
                      :color="building.sellable === 'sell' ? 'success' : 'error'"
                      size="small"
                    >
                      {{ building.sellable === 'sell' ? 'Sell' : 'Not Sell' }}
                    </VChip>
                    <span
                      v-else
                      class="text-disabled"
                    >-</span>
                  </td>
                  <td>
                    <VChip
                      v-if="building.connectivity"
                      :color="building.connectivity === 'online' ? 'success' : building.connectivity === 'manual' ? 'warning' : 'default'"
                      size="small"
                    >
                      {{ building.connectivity === 'online' ? 'Online' : building.connectivity === 'manual' ? 'Manual' : 'Not Yet Checked' }}
                    </VChip>
                    <span
                      v-else
                      class="text-disabled"
                    >-</span>
                  </td>
                  <td>
                    <span class="text-body-2">{{ formatDate(building.synced_at) }}</span>
                  </td>
                  <td class="text-center">
                    <VBtn
                      icon
                      size="small"
                      color="primary"
                      variant="text"
                      @click="handleEdit(building)"
                    >
                      <VIcon icon="ri-edit-line" />
                      <VTooltip
                        activator="parent"
                        location="top"
                      >
                        Edit
                      </VTooltip>
                    </VBtn>
                  </td>
                </tr>
                <tr v-if="buildings.length === 0">
                  <td
                    colspan="12"
                    class="text-center text-disabled py-8"
                  >
                    No buildings found. Click "Sync from ERP" to fetch building data.
                  </td>
                </tr>
              </tbody>
            </VTable>

            <!-- Pagination Controls -->
            <div class="d-flex justify-space-between align-center mt-4">
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
                />

                <VPagination
                  v-model="currentPage"
                  :length="Math.ceil(totalRecords / itemsPerPage)"
                  :total-visible="5"
                  density="compact"
                />
              </div>
            </div>
          </div>
        </VCardText>
      </VCard>
    </VCol>

    <!-- Snackbar for feedback -->
    <!--
      Import preview. A blank cell empties a value on this import, so clearing is
      called out above the counts rather than left for the operator to notice.
    -->
    <VDialog
      v-model="previewDialog"
      max-width="760"
    >
      <VCard>
        <VCardItem>
          <VCardTitle>Check before applying</VCardTitle>
        </VCardItem>
        <VCardText>
          <VAlert
            v-if="clearedCount"
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            <div class="font-weight-medium mb-1">
              This upload will clear {{ clearedCount }} field{{ clearedCount === 1 ? '' : 's' }}.
            </div>
            <div class="text-body-2">
              A blank cell empties the value. Every change is recorded against the
              building and can be read back from its history.
            </div>
          </VAlert>

          <div class="d-flex gap-6 flex-wrap mb-4">
            <div>
              <div class="text-caption text-disabled">
                Rows
              </div><div class="text-h6">
                {{ preview?.rows ?? 0 }}
              </div>
            </div>
            <div>
              <div class="text-caption text-disabled">
                New
              </div><div class="text-h6">
                {{ preview?.created ?? 0 }}
              </div>
            </div>
            <div>
              <div class="text-caption text-disabled">
                Changed
              </div><div class="text-h6">
                {{ preview?.updated ?? 0 }}
              </div>
            </div>
            <div>
              <div class="text-caption text-disabled">
                Unchanged
              </div><div class="text-h6">
                {{ preview?.unchanged ?? 0 }}
              </div>
            </div>
            <div v-if="clearedCount">
              <div class="text-caption text-disabled">
                Cleared
              </div><div class="text-h6 text-warning">
                {{ clearedCount }}
              </div>
            </div>
          </div>

          <!--
            Two lists, deliberately apart: a clear destroys a value, a notice
            only wants reading. They shared one table until 2026-09-23 and the
            dialog showed accepted statuses under "What will be cleared".
          -->
          <div
            v-if="preview?.clears?.length"
            class="mb-4"
          >
            <div class="text-subtitle-2 mb-2 text-warning">
              What will be cleared
            </div>
            <VTable density="compact">
              <thead>
                <tr>
                  <th>Row</th><th>Column</th><th>Currently</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(clear, i) in preview.clears"
                  :key="i"
                >
                  <td>{{ clear.row }}</td>
                  <td>{{ clear.column }}</td>
                  <td class="text-disabled">
                    {{ clear.value }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>

          <div
            v-if="preview?.notices?.length"
            class="mb-4"
          >
            <div class="text-subtitle-2 mb-2">
              Accepted, worth a look
            </div>
            <VTable density="compact">
              <thead>
                <tr>
                  <th>Row</th><th>Column</th><th>Value</th><th>Note</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(notice, i) in preview.notices"
                  :key="i"
                >
                  <td>{{ notice.row }}</td>
                  <td>{{ notice.column }}</td>
                  <td>{{ notice.value }}</td>
                  <td class="text-disabled">
                    {{ notice.message }}
                  </td>
                </tr>
              </tbody>
            </VTable>
          </div>

          <div v-if="preview?.errors?.length">
            <div class="text-subtitle-2 mb-2 text-error">
              {{ preview.errors.length }} row{{ preview.errors.length === 1 ? '' : 's' }} will be left out
            </div>
            <VTable density="compact">
              <thead>
                <tr>
                  <th>Row</th><th>Column</th><th>Problem</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(error, i) in preview.errors"
                  :key="i"
                >
                  <td>{{ error.row }}</td>
                  <td>{{ error.column }}</td>
                  <td>{{ error.message }}</td>
                </tr>
              </tbody>
            </VTable>
          </div>
        </VCardText>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            @click="cancelImport"
          >
            Cancel
          </VBtn>
          <VBtn
            color="primary"
            :loading="isFileBusy"
            @click="applyImport"
          >
            Apply
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
