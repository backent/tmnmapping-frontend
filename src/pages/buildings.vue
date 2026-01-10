<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useBuildingStore } from '@/stores/building'
import type { Building } from '@/types/building'

const router = useRouter()
const buildingStore = useBuildingStore()

const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

// Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(10)
const sortBy = ref<{ key: string; order: 'asc' | 'desc' }[]>([{ key: 'created_at', order: 'desc' }])

// Search state
const searchQuery = ref('')
const searchDebounce = ref<NodeJS.Timeout | null>(null)

// Filter state
const filterBuildingStatus = ref<string | null>(null)
const filterSellable = ref<string | null>(null)
const filterConnectivity = ref<string | null>(null)
const filterResourceType = ref<string | null>(null)
const filterCompetitorLocation = ref<boolean | null>(null)
const filterCbdArea = ref<string | null>(null)

// Computed properties
const buildings = computed(() => buildingStore.buildings)
const isLoading = computed(() => buildingStore.isLoading)
const isSyncing = computed(() => buildingStore.isSyncing)
const totalRecords = computed(() => buildingStore.pagination.total)
const filterOptions = computed(() => buildingStore.filterOptions)

// Fetch buildings with pagination
const fetchBuildings = async () => {
  try {
    const skip = (currentPage.value - 1) * itemsPerPage.value

    const params: any = {
      take: itemsPerPage.value,
      skip,
    }

    // Add search if present
    if (searchQuery.value.trim()) {
      params.search = searchQuery.value.trim()
    }

    // Add filters if present
    if (filterBuildingStatus.value) {
      params.building_status = filterBuildingStatus.value
    }
    if (filterSellable.value) {
      params.sellable = filterSellable.value
    }
    if (filterConnectivity.value) {
      params.connectivity = filterConnectivity.value
    }
    if (filterResourceType.value) {
      params.resource_type = filterResourceType.value
    }
    if (filterCompetitorLocation.value !== null) {
      params.competitor_location = filterCompetitorLocation.value
    }
    if (filterCbdArea.value) {
      params.cbd_area = filterCbdArea.value
    }

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

// Watch for pagination/sort changes
watch([currentPage, itemsPerPage, sortBy], () => {
  fetchBuildings()
}, { deep: true })

// Watch for search changes with debounce
watch(searchQuery, () => {
  // Reset to first page when searching
  currentPage.value = 1

  // Clear existing timeout
  if (searchDebounce.value) {
    clearTimeout(searchDebounce.value)
  }

  // Debounce search - wait 500ms after user stops typing
  searchDebounce.value = setTimeout(() => {
    fetchBuildings()
  }, 500)
})

// Watch for filter changes
watch([filterBuildingStatus, filterSellable, filterConnectivity, filterResourceType, filterCompetitorLocation, filterCbdArea], () => {
  // Reset to first page when filters change
  currentPage.value = 1
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
  filterBuildingStatus.value = null
  filterSellable.value = null
  filterConnectivity.value = null
  filterResourceType.value = null
  filterCompetitorLocation.value = null
  filterCbdArea.value = null
  currentPage.value = 1
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
        <VCardTitle class="d-flex align-center justify-space-between">
          <span>Buildings</span>
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
        </VCardTitle>

        <VCardText>
          <!-- Filters -->
          <VRow class="mb-4">
            <VCol cols="12" md="2">
              <VSelect
                v-model="filterBuildingStatus"
                :items="filterOptions?.building_status || []"
                label="Status"
                placeholder="All"
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="2">
              <VSelect
                v-model="filterSellable"
                :items="filterOptions?.sellable || []"
                label="Sellable"
                placeholder="All"
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="2">
              <VSelect
                v-model="filterConnectivity"
                :items="filterOptions?.connectivity || []"
                label="Connectivity"
                placeholder="All"
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="2">
              <VSelect
                v-model="filterResourceType"
                :items="filterOptions?.resource_type || []"
                label="Resource Type"
                placeholder="All"
                clearable
                density="compact"
                hide-details
              />
            </VCol>
            <VCol cols="12" md="2">
              <VSelect
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
            <VCol cols="12" md="2">
              <VSelect
                v-model="filterCbdArea"
                :items="filterOptions?.cbd_area || []"
                label="CBD Area"
                placeholder="All"
                clearable
                density="compact"
                hide-details
              />
            </VCol>
          </VRow>

          <!-- Search and Clear Filters -->
          <VRow class="mb-4">
            <VCol cols="12" md="4">
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
            <VCol cols="12" md="2">
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
                  <th class="text-uppercase">
                    ID
                  </th>
                  <th class="text-uppercase">
                    Name
                  </th>
                  <th class="text-uppercase">
                    IRIS Code
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
                  <td>{{ building.id }}</td>
                  <td>
                    <span class="font-weight-medium">{{ building.name }}</span>
                  </td>
                  <td>
                    <code
                      v-if="building.iris_code"
                      class="text-primary"
                    >{{ building.iris_code }}</code>
                    <span
                      v-else
                      class="text-disabled"
                    >-</span>
                  </td>
                  <td>
                    <span v-if="building.project_name">{{ building.project_name }}</span>
                    <span
                      v-else
                      class="text-disabled"
                    >-</span>
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
    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      :timeout="3000"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </VRow>
</template>
