<script setup lang="ts">
import { useMappingStore } from '@/stores/mapping'
import { useAuthStore } from '@/stores/auth'
import { exportMappingData } from '@/utils/exportUtils'
import { useDebounceFn } from '@vueuse/core'
import BuildingTypeFilter from './BuildingTypeFilter.vue'
import InstallationFilter from './InstallationFilter.vue'
import ScreenTypeFilter from './ScreenTypeFilter.vue'
import ProgressFilter from './ProgressFilter.vue'
import LCDPresenceFilter from './LCDPresenceFilter.vue'
import BuildingGradeFilter from './BuildingGradeFilter.vue'
import YearRangeFilter from './YearRangeFilter.vue'
import RadiusFilter from './RadiusFilter.vue'
import LocationFilter from './LocationFilter.vue'
import BuildingDetail from './BuildingDetail.vue'
import PlaceDetail from './PlaceDetail.vue'

interface Props {
  reporting?: boolean
}

interface Emits {
  (e: 'update:showSingle', value: boolean): void
  (e: 'update:showMulti', value: boolean): void
}

const props = withDefaults(defineProps<Props>(), {
  reporting: false,
})

const emit = defineEmits<Emits>()

const mappingStore = useMappingStore()
const authStore = useAuthStore()

const showInner = ref(true)
const showSingle = ref(false)
const showMulti = ref(false)

const isReporting = computed(() => {
  return props.reporting || authStore.currentUser?.role === 12
})

// Debounced filter update
const debouncedUpdateFilters = useDebounceFn(async () => {
  await mappingStore.fetchBuildings()
}, 1000)

// Watch filters and update
watch(() => mappingStore.filters, () => {
  debouncedUpdateFilters()
}, { deep: true })

const handleReset = async () => {
  await mappingStore.resetFilters()
}

const handleExport = async () => {
  try {
    const blob = await mappingStore.exportData()
    exportMappingData(blob)
  }
  catch (error) {
    console.error('Error exporting data:', error)
  }
}

const handleSingleLocationClick = () => {
  showSingle.value = true
  showMulti.value = false
  showInner.value = false
  emit('update:showSingle', true)
  emit('update:showMulti', false)
}

const handleMultiLocationClick = () => {
  showSingle.value = false
  showMulti.value = true
  showInner.value = false
  emit('update:showSingle', false)
  emit('update:showMulti', true)
}
</script>

<template>
  <div>
    <!-- Building Type Totals -->
    <div
      v-if="!mappingStore.isLoading"
      class="text-center pb-2 pt-1"
    >
      <VChip class="ma-1">
        A: {{ mappingStore.totals.apartment }}
      </VChip>
      <VChip class="ma-1">
        O: {{ mappingStore.totals.office }}
      </VChip>
      <VChip class="ma-1">
        H: {{ mappingStore.totals.hotel }}
      </VChip>
      <VChip class="ma-1">
        R: {{ mappingStore.totals.retail }}
      </VChip>
      <VChip class="ma-1">
        OT: {{ mappingStore.totals.other }}
      </VChip>
    </div>

    <VDivider />

    <!-- Initial Mode Selection -->
    <div v-if="showInner">
      <div class="mb-5 inner-type text-center">
        <h3 style="font-weight: bold">
          Choose filter type:
        </h3>
      </div>

      <div class="text-center mt-5 mb-4">
        <VBtn
          small
          @click="handleSingleLocationClick"
        >
          Single Location
        </VBtn>
      </div>

      <div
        v-if="!isReporting"
        class="text-center mt-4 mb-3"
      >
        <h4>OR</h4>
      </div>

      <div
        v-if="!isReporting"
        class="text-center mt-3 mb-4"
      >
        <VBtn
          small
          color="primary"
          @click="handleMultiLocationClick"
        >
          Multi Location
        </VBtn>
      </div>
    </div>

    <!-- Single Location Mode -->
    <div
      v-if="showSingle"
      class="pl-4 pr-4 pt-4 pb-4"
    >
      <VForm>
        <VList>
          <!-- Location Filter -->
          <LocationFilter
            :model-value="mappingStore.filters.district_subdistrict || []"
            mode="single"
            @update:model-value="mappingStore.filters.district_subdistrict = $event"
            @place-selected="(place) => {
              if (place.geometry?.location) {
                mappingStore.setMapCenter(
                  place.geometry.location.lat(),
                  place.geometry.location.lng()
                )
              }
            }"
          />

          <!-- Building Detail -->
          <BuildingDetail
            v-if="mappingStore.selectedBuilding"
            :building="mappingStore.selectedBuilding"
            :reporting="isReporting"
            @close="mappingStore.setSelectedBuilding(null)"
          />

          <!-- Filter Card -->
          <VCard class="mb-4 pb-2">
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

            <VDivider />

            <!-- Year Range -->
            <YearRangeFilter
              v-if="!isReporting"
              :model-value="mappingStore.yearRange"
              :reporting="isReporting"
              @update:model-value="mappingStore.filters.year = $event; mappingStore.yearRange = $event"
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

    <!-- Multi Location Mode -->
    <div
      v-if="showMulti"
      class="pl-4 pr-4 pt-5 pb-4"
    >
      <!-- Building Detail -->
      <BuildingDetail
        v-if="mappingStore.selectedBuilding"
        :building="mappingStore.selectedBuilding"
        :reporting="isReporting"
        @close="mappingStore.setSelectedBuilding(null)"
      />

      <!-- Location Filter -->
      <LocationFilter
        :model-value="mappingStore.filters.district_subdistrict || []"
        mode="multi"
        @update:model-value="mappingStore.filters.district_subdistrict = $event"
      />

      <!-- Export Button -->
      <div class="pt-4">
        <VBtn
          v-if="!isReporting"
          class="mb-2"
          color="success"
          depressed
          block
          @click="handleExport"
        >
          download report
        </VBtn>

        <!-- Reset Button -->
        <VBtn
          color="primary"
          depressed
          block
          @click="handleReset"
        >
          reset
        </VBtn>
      </div>
    </div>

    <!-- Bottom Buttons -->
    <div
      v-if="showInner"
      class="btn-bottom text-center"
    >
      <VDivider />
      <div class="pt-5">
        <VBtn @click="$router.push('/dashboard')">
          <VIcon>mdi-login-variant</VIcon>
          Back to Dashboard
        </VBtn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inner-type {
  margin-top: 60px;
}

.btn-bottom {
  margin-top: 64px;
}
</style>

