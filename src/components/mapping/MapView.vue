<script setup lang="ts">
import { Loader } from '@googlemaps/js-api-loader'
// NOTE: MarkerClusterer groups nearby markers into clusters for better performance
// Uncomment the line below to re-enable marker clustering
// import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { nextTick } from 'vue'
import { useMappingStore } from '@/stores/mapping'
import { getMarkerIconConfig } from '@/utils/markerUtils'
import type { MappingBuilding } from '@/types/mapping'
import type { MappingFilters } from '@/types/mapping'

interface Props {
  buildings: MappingBuilding[]
  center: { lat: number; lng: number }
  radius: number
  filters: MappingFilters
  reporting?: boolean
}

interface Emits {
  (e: 'markerClick', building: MappingBuilding): void
  (e: 'mapDoubleClick', lat: number, lng: number): void
}

const props = withDefaults(defineProps<Props>(), {
  reporting: false,
})

const emit = defineEmits<Emits>()

const mapContainer = ref<HTMLDivElement>()
const map = ref<google.maps.Map | null>(null)
const markers = ref<google.maps.Marker[]>([])
// NOTE: Clusterer disabled - uncomment to re-enable marker clustering
// const clusterer = ref<MarkerClusterer | null>(null)
const circle = ref<google.maps.Circle | null>(null)
const centerMarker = ref<google.maps.Marker | null>(null)

const mappingStore = useMappingStore()

const isMapLoaded = ref(false)

// Initialize Google Maps
onMounted(async () => {
  if (!mapContainer.value) {
    return
  }

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.error('VITE_GOOGLE_MAPS_API_KEY is not set')
    return
  }

  try {
    const loader = new Loader({
      apiKey,
      version: 'weekly',
      libraries: ['places', 'geometry'],
    })

    await loader.load()

    map.value = new google.maps.Map(mapContainer.value, {
      center: props.center,
      zoom: 12,
      disableDoubleClickZoom: true,
    })

    // Handle double click
    map.value.addListener('dblclick', (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        const lat = event.latLng.lat()
        const lng = event.latLng.lng()
        mappingStore.setMapCenter(lat, lng)
        emit('mapDoubleClick', lat, lng)
      }
    })

    isMapLoaded.value = true
    updateMarkers()
    updateCircle()
  }
  catch (error) {
    console.error('Error loading Google Maps:', error)
  }
})

// Update markers when buildings change
watch(() => props.buildings, async () => {
  if (isMapLoaded.value) {
    await updateMarkers()
  }
})

// Update center when it changes
watch(() => props.center, () => {
  if (map.value && isMapLoaded.value) {
    map.value.setCenter(props.center)
    updateCircle()
  }
})

// Update radius circle
watch(() => props.radius, () => {
  if (isMapLoaded.value) {
    updateCircle()
  }
})

async function updateMarkers() {
  if (!map.value) {
    return
  }

  // Step 1: AGGRESSIVELY clear ALL existing markers
  const oldMarkers = [...markers.value]
  
  // Immediately clear the markers array so no references remain
  markers.value = []
  
  // Remove each old marker completely
  for (const marker of oldMarkers) {
    try {
      // Clear all event listeners first
      google.maps.event.clearInstanceListeners(marker)
      // Hide the marker immediately
      marker.setVisible(false)
      // Remove from map
      marker.setMap(null)
    }
    catch (error) {
      console.error('Error removing marker:', error)
    }
  }

  // Step 2: Wait for Vue's next tick AND give Google Maps time to process
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 100))

  // Step 3: If no buildings, we're done
  if (!props.buildings || props.buildings.length === 0) {
    return
  }

  // Step 4: Create ALL new markers first (without adding to map)
  const installation = props.filters.installation || []
  const newMarkers: google.maps.Marker[] = []
  
  for (const building of props.buildings) {
    const iconConfig = getMarkerIconConfig(building, installation, props.reporting || false)

    if (!iconConfig) {
      continue
    }

    try {
      // Create marker but don't add to map yet
      const marker = new google.maps.Marker({
        position: {
          lat: building.coordinates.lat,
          lng: building.coordinates.lng,
        },
        icon: iconConfig,
        title: building.building_name,
        visible: false, // Start hidden
        optimized: false, // Disable optimization to force re-render
      })

      marker.addListener('click', () => {
        emit('markerClick', building)
      })

      newMarkers.push(marker)
    }
    catch (error) {
      console.error('Error creating marker:', error)
    }
  }
  
  // Step 5: Now add all markers to map at once and make visible
  for (const marker of newMarkers) {
    marker.setMap(map.value)
    marker.setVisible(true)
  }
  
  // Step 6: Update our markers reference
  markers.value = newMarkers

  // NOTE: Marker clustering disabled
}

function updateCircle() {
  if (!map.value) {
    return
  }

  // Only show circle and center marker if radius > 0
  if (props.radius > 0) {
    // Update or create circle
    if (circle.value) {
      // Update existing circle
      circle.value.setCenter(props.center)
      circle.value.setRadius(props.radius * 1000)
    }
    else {
      // Create new circle
      circle.value = new google.maps.Circle({
        center: props.center,
        radius: props.radius * 1000, // Convert km to meters
        fillColor: '#ff0000',
        fillOpacity: 0.2,
        strokeWeight: 1,
        strokeOpacity: 1,
        strokeColor: '#ff0000',
        map: map.value,
      })
    }

    // Update or create center marker
    if (centerMarker.value) {
      // Update existing marker position
      centerMarker.value.setPosition(props.center)
      if (!centerMarker.value.getMap()) {
        centerMarker.value.setMap(map.value)
      }
    }
    else {
      // Create new center marker
      centerMarker.value = new google.maps.Marker({
        position: props.center,
        map: map.value,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#ffe34c',
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#000',
        },
        zIndex: 1000,
      })
    }
  }
  else {
    // Remove circle and center marker when radius is 0
    if (circle.value) {
      circle.value.setMap(null)
      circle.value = null
    }
    if (centerMarker.value) {
      centerMarker.value.setMap(null)
      centerMarker.value = null
    }
  }
}

onBeforeUnmount(() => {
  // Clean up markers
  markers.value.forEach(marker => marker.setMap(null))
  // NOTE: Clusterer cleanup disabled - uncomment to re-enable
  // if (clusterer.value) {
  //   clusterer.value.clearMarkers()
  // }
  if (circle.value) {
    circle.value.setMap(null)
  }
  if (centerMarker.value) {
    centerMarker.value.setMap(null)
  }
})
</script>

<template>
  <div
    ref="mapContainer"
    class="map-container"
  />
</template>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  min-height: 600px;
}
</style>

