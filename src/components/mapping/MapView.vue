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
const poiPointMarkers = ref<google.maps.Marker[]>([])
const poiCircles = ref<google.maps.Circle[]>([])

const mappingStore = useMappingStore()

const isMapLoaded = ref(false)
const selectedPOI = computed(() => mappingStore.selectedPOI)

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
    updatePOIMarkers()
    updatePOICircles()
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
    updatePOICircles()
  }
})

// Watch selected POI
watch(() => selectedPOI.value, () => {
  if (isMapLoaded.value) {
    updatePOIMarkers()
    updatePOICircles()
    updateCircle() // Update map center circle (hide if POI selected)
    // Adjust zoom to show all POI points (only when POI is selected, not on radius change)
    fitPOIBounds()
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

      // marker.addListener('click', () => {
      //   emit('markerClick', building)
      // })

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

function updatePOIMarkers() {
  if (!map.value) {
    return
  }

  // Clear existing POI markers
  poiPointMarkers.value.forEach(marker => {
    google.maps.event.clearInstanceListeners(marker)
    marker.setMap(null)
  })
  poiPointMarkers.value = []

  // If POI is selected, create markers for each POI point
  if (selectedPOI.value && selectedPOI.value.points.length > 0) {
    const poiColor = selectedPOI.value.color

    for (const point of selectedPOI.value.points) {
      try {
        const marker = new google.maps.Marker({
          position: {
            lat: point.latitude,
            lng: point.longitude,
          },
          map: map.value,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: poiColor,
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#000',
          },
          title: `${selectedPOI.value.name} - ${point.place_name}`,
          zIndex: 999,
        })

        poiPointMarkers.value.push(marker)
      }
      catch (error) {
        console.error('Error creating POI point marker:', error)
      }
    }
  }
}

function updatePOICircles() {
  if (!map.value) {
    return
  }

  // Clear existing POI circles
  poiCircles.value.forEach(circle => {
    circle.setMap(null)
  })
  poiCircles.value = []

  // If POI is selected AND radius > 0, create circles for each POI point
  if (selectedPOI.value && props.radius > 0 && selectedPOI.value.points.length > 0) {
    const poiColor = selectedPOI.value.color

    for (const point of selectedPOI.value.points) {
      try {
        const circle = new google.maps.Circle({
          center: {
            lat: point.latitude,
            lng: point.longitude,
          },
          radius: props.radius * 1000, // Convert km to meters
          fillColor: poiColor,
          fillOpacity: 0.2,
          strokeWeight: 1,
          strokeOpacity: 1,
          strokeColor: poiColor,
          map: map.value,
        })

        poiCircles.value.push(circle)
      }
      catch (error) {
        console.error('Error creating POI circle:', error)
      }
    }
  }
}

function fitPOIBounds() {
  if (!map.value || !selectedPOI.value || selectedPOI.value.points.length === 0) {
    return
  }

  try {
    const bounds = new google.maps.LatLngBounds()

    // Add all POI point coordinates to bounds
    for (const point of selectedPOI.value.points) {
      bounds.extend({
        lat: point.latitude,
        lng: point.longitude,
      })
    }

    // If radius circles exist, include their bounds to show full radius area
    if (poiCircles.value.length > 0) {
      for (const circle of poiCircles.value) {
        const circleBounds = circle.getBounds()
        if (circleBounds) {
          bounds.union(circleBounds)
        }
      }
    }

    // Only fit bounds if we have valid bounds
    if (!bounds.isEmpty()) {
      // Add padding (in pixels) so markers aren't at the edge
      const padding = 50
      map.value.fitBounds(bounds, padding)
    }
  }
  catch (error) {
    console.error('Error fitting POI bounds:', error)
  }
}

function updateCircle() {
  if (!map.value) {
    return
  }

  // Only show circle and center marker if radius > 0 AND POI is NOT selected
  if (props.radius > 0 && !selectedPOI.value) {
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
  // Clean up POI markers
  poiPointMarkers.value.forEach(marker => marker.setMap(null))
  // Clean up POI circles
  poiCircles.value.forEach(circle => circle.setMap(null))
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
  <div class="map-wrapper">
    <div
      ref="mapContainer"
      class="map-container"
    />
    <!-- Loading Overlay -->
    <div
      v-if="mappingStore.isLoading"
      class="map-loading-overlay"
    >
      <div class="loading-content">
        <VProgressCircular
          indeterminate
          color="primary"
          size="64"
        />
        <p class="mt-4 text-body-1">
          Loading...
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.map-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.map-container {
  width: 100%;
  height: 100%;
  min-height: 600px;
}

.map-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background-color: rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  transition: opacity 0.3s ease-in-out;
}

.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
</style>

