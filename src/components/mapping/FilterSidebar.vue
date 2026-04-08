<script setup lang="ts">
import { watch } from 'vue'
import { useMappingStore } from '@/stores/mapping'
import { useBuildingStore } from '@/stores/building'
import { useAuthStore } from '@/stores/auth'
import { exportMappingData } from '@/utils/exportUtils'
import { useDebounceFn } from '@vueuse/core'
import BuildingTypeFilter from './BuildingTypeFilter.vue'
import InstallationFilter from './InstallationFilter.vue'
import ScreenTypeFilter from './ScreenTypeFilter.vue'
import ProgressFilter from './ProgressFilter.vue'
import LCDPresenceFilter from './LCDPresenceFilter.vue'
import BuildingGradeFilter from './BuildingGradeFilter.vue'
import SellableFilter from './SellableFilter.vue'
import ConnectivityFilter from './ConnectivityFilter.vue'
import SalesPackageFilter from './SalesPackageFilter.vue'
import BuildingRestrictionFilter from './BuildingRestrictionFilter.vue'
import YearRangeFilter from './YearRangeFilter.vue'
import RadiusFilter from './RadiusFilter.vue'
import LocationFilter from './LocationFilter.vue'
import POIFilter from './POIFilter.vue'
import BuildingDetail from './BuildingDetail.vue'
import SavePolygonDialog from './SavePolygonDialog.vue'
import SavedPolygonFilter from './SavedPolygonFilter.vue'

interface Props {
  reporting?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  reporting: false,
})

const mappingStore = useMappingStore()
const buildingStore = useBuildingStore()
const authStore = useAuthStore()
const savePolygonDialogOpen = ref(false)
const isExporting = ref(false)
const snackbar = ref(false)
const snackbarMessage = ref('')
const snackbarColor = ref<'success' | 'error'>('success')

const isReporting = computed(() => {
  return props.reporting || authStore.currentUser?.role === '12'
})

// Debounced filter update
const debouncedUpdateFilters = useDebounceFn(async () => {
  await mappingStore.fetchBuildings()
}, 1000)

// Watch filters and update (exclude poi_ids and polygon so they don't double-fetch;
// setSelectedPOIs and setPolygon already call fetchBuildings() when those change)
watch(
  () => {
    const { poi_ids: _poi, polygon: _polygon, ...rest } = mappingStore.filters
    return JSON.stringify(rest)
  },
  () => {
    debouncedUpdateFilters()
  },
)

const handleReset = async () => {
  await mappingStore.resetFilters()
}

const handleExport = async () => {
  if (mappingStore.totalBuildings === 0) {
    snackbarMessage.value = 'No data to export'
    snackbarColor.value = 'error'
    snackbar.value = true
    return
  }
  isExporting.value = true
  try {
    const blob = await mappingStore.exportData()
    exportMappingData(blob)
    snackbarMessage.value = 'Report downloaded successfully'
    snackbarColor.value = 'success'
    snackbar.value = true
  }
  catch (error: any) {
    snackbarMessage.value = error?.message || 'Failed to download report'
    snackbarColor.value = 'error'
    snackbar.value = true
  }
  finally {
    isExporting.value = false
  }
}

// Helper function to generate initial from building type name
// Examples: "Apartment" -> "A", "Mixed Use" -> "MU", "Office Building" -> "OB"
const getBuildingTypeInitial = (typeName: string): string => {
  // Handle special cases
  const specialCases: Record<string, string> = {
    'other': 'OT',
    'mixed use': 'MU',
    'office building': 'OB',
  }

  const lowerName = typeName.toLowerCase()

  if (specialCases[lowerName])
    return specialCases[lowerName]

  // For single word types, return first letter
  if (!typeName.includes(' '))
    return typeName.charAt(0).toUpperCase()

  // For multi-word types, return first letter of each word
  return typeName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
}

// Helper function to map building type name to totals key
// Examples: "Apartment" -> "apartment", "Other" -> "other"
const getTotalsKey = (typeName: string): string => {
  // Handle special case for "Other" -> "other" (not "others")
  if (typeName.toLowerCase() === 'other')
    return 'other'

  // Convert to lowercase for most cases
  return typeName.toLowerCase()
}

// Computed property for dynamic building type totals based on API data
// Shows all building types from /api/building-filter-options, even if count is 0
const buildingTypeTotals = computed(() => {
  const totals = mappingStore.totals
  const buildingTypes = buildingStore.filterOptions?.building_type || []

  return buildingTypes
    .map(typeName => {
      const totalsKey = getTotalsKey(typeName)
      // Get total from the dynamic totals map (defaults to 0 if not found)
      const total = totals[totalsKey] || 0

      return {
        name: typeName,
        initial: getBuildingTypeInitial(typeName),
        total,
        key: totalsKey,
      }
    })
  // Removed filter - show all building types from filter options, even with 0 counts
})
</script>

<template>
  <div class="filter-sidebar-container">
    <!-- Building Type Totals -->
    <div v-if="buildingTypeTotals.length > 0">
      <div class="px-3 pt-2 pb-1 text-caption text-medium-emphasis">
        Total buildings: <strong>{{ mappingStore.totalBuildings }}</strong>
      </div>
      <div class="chip-grid pb-2 pt-1 px-1">
        <VChip
          v-for="type in buildingTypeTotals"
          :key="type.key"
          class="ma-1 justify-center"
        >
          {{ type.initial }}: {{ type.total }}
        </VChip>
      </div>
    </div>

    <VDivider />

    <!-- Single Location Mode -->
    <div class="pl-4 pr-4 pt-4 pb-4">
      <VForm>
        <VList>
          <!-- Location Filter -->
          <LocationFilter
            :model-value="mappingStore.filters.district_subdistrict || []"
            mode="single"
            @update:model-value="mappingStore.filters.district_subdistrict = $event"
          />

          <!-- Building Detail -->
          <BuildingDetail
            v-if="mappingStore.selectedBuilding"
            :building="mappingStore.selectedBuilding"
            :reporting="isReporting"
            @close="mappingStore.setSelectedBuilding(null)"
          />


         

          <!-- Filter Card -->
          <VCard class="mb-4 pb-2" >
            <div>

              <!-- Polygon filter: draw on map, filter buildings inside -->
              <VDivider />
              <VSubheader>Polygon</VSubheader>
              <div class="pa-3">
                <VBtn
                  v-if="!mappingStore.filters.polygon || mappingStore.filters.polygon.length < 3"
                  size="small"
                  variant="outlined"
                  block
                  @click="mappingStore.setDrawPolygonActive(true)"
                >
                  Draw polygon
                </VBtn>
                <template v-else>
                  <VBtn
                    size="small"
                    variant="outlined"
                    block
                    class="mb-2"
                    @click="savePolygonDialogOpen = true"
                  >
                    Save polygon
                  </VBtn>
                  <VBtn
                    size="small"
                    variant="outlined"
                    color="error"
                    block
                    @click="mappingStore.setPolygon(null)"
                  >
                    Clear polygon
                  </VBtn>
                </template>
              </div>
              <SavePolygonDialog
                v-model="savePolygonDialogOpen"
                :polygon="mappingStore.filters.polygon"
              />
              <SavedPolygonFilter v-if="!isReporting" />

                <!-- Building Type -->
              <BuildingTypeFilter
                :model-value="mappingStore.filters.building_type || []"
                @update:model-value="mappingStore.filters.building_type = $event"
              />

              <!-- Installation -->
              <InstallationFilter
                v-if="!isReporting"
                :model-value="mappingStore.filters.installation || []"
                @update:model-value="mappingStore.filters.installation = $event"
              />

              <!-- Screen Type -->
              <ScreenTypeFilter
                v-if="!isReporting"
                :model-value="mappingStore.filters.screen_type || []"
                @update:model-value="mappingStore.filters.screen_type = $event"
              />

              <!-- Progress -->
              <ProgressFilter
                v-if="!isReporting"
                :model-value="mappingStore.filters.progress || []"
                @update:model-value="mappingStore.filters.progress = $event"
              />

              <!-- LCD Presence -->
              <LCDPresenceFilter
                v-if="!isReporting"
                :model-value="mappingStore.filters.lcd_presence || []"
                @update:model-value="mappingStore.filters.lcd_presence = $event"
              />

              <!-- Building Grade -->
              <BuildingGradeFilter
                v-if="!isReporting"
                :model-value="mappingStore.filters.building_grade || []"
                @update:model-value="mappingStore.filters.building_grade = $event"
              />

              <!-- Sellable -->
              <SellableFilter
                v-if="!isReporting"
                :model-value="mappingStore.filters.sellable || []"
                @update:model-value="mappingStore.filters.sellable = $event"
              />

              <!-- Connectivity -->
              <ConnectivityFilter
                v-if="!isReporting"
                :model-value="mappingStore.filters.connectivity || []"
                @update:model-value="mappingStore.filters.connectivity = $event"
              />

              <!-- Sales Package -->
              <SalesPackageFilter
                v-if="!isReporting"
                :model-value="mappingStore.filters.sales_package_ids || []"
                @update:model-value="mappingStore.filters.sales_package_ids = $event"
              />

              <!-- Building Restriction -->
              <BuildingRestrictionFilter
                v-if="!isReporting"
                :model-value="mappingStore.filters.building_restriction_ids || []"
                @update:model-value="mappingStore.filters.building_restriction_ids = $event"
              />
            </div>

            <VDivider />

            <!-- Year Range -->
            <YearRangeFilter
              v-if="!isReporting"
              :model-value="mappingStore.filters.year || mappingStore.yearRange"
              :reporting="isReporting"
              @update:model-value="mappingStore.filters.year = $event"
            />

            <!-- POI Filter (above Radius) -->
            <POIFilter
              :model-value="mappingStore.filters.poi_ids"
              @update:model-value="mappingStore.setSelectedPOIs($event)"
            />

            <!-- Radius -->
            <RadiusFilter
              :model-value="mappingStore.radius"
              @update:model-value="mappingStore.setRadius($event)"
            />
          </VCard>
        </VList>

        <!-- Export Button -->
        <VBtn
          v-if="!isReporting"
          class="mb-2"
          color="success"
          depressed
          block
          :loading="isExporting"
          :disabled="isExporting"
          @click="handleExport"
        >
          download report
        </VBtn>

        <!-- Reset Button -->
        <VBtn
          class="mb-4"
          color="primary"
          depressed
          block
          @click="handleReset"
        >
          reset
        </VBtn>
      </VForm>
    </div>

    <VSnackbar
      v-model="snackbar"
      :color="snackbarColor"
      location="bottom"
    >
      {{ snackbarMessage }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.filter-sidebar-container {
  height: 100vh;
  max-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
}

.chip-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
}

</style>

