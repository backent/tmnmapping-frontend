<script setup lang="ts">
import { Loader } from '@googlemaps/js-api-loader'
import { MarkerClusterer } from '@googlemaps/markerclusterer'
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
const clusterer = ref<MarkerClusterer | null>(null)
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
watch(() => props.buildings, () => {
  if (isMapLoaded.value) {
    updateMarkers()
  }
}, { deep: true })

// Update center when it changes
watch(() => props.center, () => {
  if (map.value && isMapLoaded.value) {
    map.value.setCenter(props.center)
    updateCircle()
  }
}, { deep: true })

// Update radius circle
watch(() => props.radius, () => {
  if (isMapLoaded.value) {
    updateCircle()
  }
})

function updateMarkers() {
  if (!map.value) {
    return
  }

  // Clear existing markers
  markers.value.forEach(marker => marker.setMap(null))
  markers.value = []

  if (clusterer.value) {
    clusterer.value.clearMarkers()
    clusterer.value = null
  }

  // Create new markers
  const installation = props.filters.installation || []
  const newMarkers: google.maps.Marker[] = []

  props.buildings.forEach((building) => {
    const iconConfig = getMarkerIconConfig(building, installation, props.reporting || false)

    if (!iconConfig) {
      return
    }

    const marker = new google.maps.Marker({
      position: {
        lat: building.coordinates.lat,
        lng: building.coordinates.lng,
      },
      map: map.value,
      icon: iconConfig,
      title: building.building_name,
    })

    marker.addListener('click', () => {
      emit('markerClick', building)
    })

    newMarkers.push(marker)
  })

  markers.value = newMarkers

  // Create clusterer if we have markers
  if (newMarkers.length > 0 && map.value) {
    clusterer.value = new MarkerClusterer({
      map: map.value,
      markers: newMarkers,
    })
  }
}

function updateCircle() {
  if (!map.value) {
    return
  }

  // Remove existing circle
  if (circle.value) {
    circle.value.setMap(null)
  }

  // Remove center marker
  if (centerMarker.value) {
    centerMarker.value.setMap(null)
  }

  // Only show circle if radius > 0
  if (props.radius > 0) {
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

    // Add center marker
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

onBeforeUnmount(() => {
  // Clean up markers
  markers.value.forEach(marker => marker.setMap(null))
  if (clusterer.value) {
    clusterer.value.clearMarkers()
  }
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

