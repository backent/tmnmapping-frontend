<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useMappingStore } from '@/stores/mapping'
import { useBuildingStore } from '@/stores/building'
import { useAuthStore } from '@/stores/auth'
import MapView from '@/components/mapping/MapView.vue'
import FilterSidebar from '@/components/mapping/FilterSidebar.vue'

const mappingStore = useMappingStore()
const buildingStore = useBuildingStore()
const authStore = useAuthStore()

const drawer = ref(true)
const showSingleLocation = ref(false)
const showMultiLocation = ref(false)

const isReporting = computed(() => {
  return authStore.currentUser?.role === 12
})

// Initialize data
onMounted(async () => {
  await Promise.all([
    buildingStore.fetchFilterOptions(), // Fetch building filter options first
    // Removed API calls that return 404:
    // mappingStore.fetchFilterOptions(),
    // mappingStore.fetchYearList(),
    // mappingStore.fetchPotentialClients(),
    // mappingStore.fetchScreenTypes(),
    mappingStore.fetchBuildings(),
  ])
})

// Watch for filter changes and update buildings
watch(
  () => mappingStore.filters,
  () => {
    // Filters are debounced in FilterSidebar, so we don't need to fetch here
  },
  { deep: true },
)

const handleMarkerClick = (building: any) => {
  mappingStore.setSelectedBuilding(building)
  drawer.value = true
}

const handleMapDoubleClick = (lat: number, lng: number) => {
  mappingStore.setMapCenter(lat, lng)
  mappingStore.fetchBuildings()
}
</script>

<template>
  <VApp>
    <VNavigationDrawer
      v-model="drawer"
      width="326"
      app
    >
      <FilterSidebar
        :reporting="isReporting"
        @update:show-single="showSingleLocation = $event"
        @update:show-multi="showMultiLocation = $event"
      />
    </VNavigationDrawer>

    <VMain>
      <MapView
        :buildings="mappingStore.buildings"
        :center="mappingStore.mapCenter"
        :radius="mappingStore.radius"
        :filters="mappingStore.filters"
        :reporting="isReporting"
        @marker-click="handleMarkerClick"
        @map-double-click="handleMapDoubleClick"
      />

      <!-- Floating button for mobile -->
      <VBtn
        v-if="$vuetify.display.mdAndDown"
        class="float-button ma-2 white--text"
        color="primary"
        fab
        @click="drawer = !drawer"
      >
        <VIcon dark>mdi-magnify</VIcon>
      </VBtn>
    </VMain>
  </VApp>
</template>

<style scoped>
.float-button {
  position: absolute;
  bottom: 0;
  z-index: 1000;
}
</style>

