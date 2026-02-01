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
const drawingManager = ref<google.maps.drawing.DrawingManager | null>(null)
const filterPolygonOverlay = ref<google.maps.Polygon | null>(null)
let overlaycompleteListener: google.maps.MapsEventListener | null = null
let idleListener: google.maps.MapsEventListener | null = null
let mapClickListener: google.maps.MapsEventListener | null = null
const IDLE_DEBOUNCE_MS = 350
let idleDebounceTimer: ReturnType<typeof setTimeout> | null = null
// Click radius in pixels; converted to meters using current zoom so hit area is consistent on screen
const CLICK_MAX_RADIUS_PX = 40
// Buildings within this many meters of the nearest are "same position" (multi-building picker)
const SAME_POSITION_EPSILON_METERS = 1
// Fallback max radius in meters when map/container not ready
const FALLBACK_MAX_RADIUS_METERS = 1000

const mappingStore = useMappingStore()

const isMapLoaded = ref(false)
const showBuildingPicker = ref(false)
const buildingPickerCandidates = ref<MappingBuilding[]>([])
const selectedPOI = computed(() => mappingStore.selectedPOI)
const drawPolygonActive = computed(() => mappingStore.drawPolygonActive)
const filterPolygon = computed(() => mappingStore.filters.polygon)

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
      libraries: ['places', 'geometry', 'drawing'],
    })

    await loader.load()

    map.value = new google.maps.Map(mapContainer.value, {
      center: props.center,
      zoom: 12,
      disableDoubleClickZoom: true,
      clickableIcons: false, // Disable interaction with Google POI (restaurants, etc.)
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

    // Single map-level click: resolve latLng to building(s) and emit or show picker
    mapClickListener = google.maps.event.addListener(map.value, 'click', (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) {
        console.log('[MapView] map click: no latLng')
        return
      }
      const clickLat = event.latLng.lat()
      const clickLng = event.latLng.lng()
      const maxRadiusMeters = getClickRadiusMeters()
      console.log('[MapView] map click:', { lat: clickLat, lng: clickLng, maxRadiusMeters: maxRadiusMeters.toFixed(0), zoom: map.value?.getZoom?.() })
      const candidates = findBuildingAtClick(event.latLng, maxRadiusMeters)
      if (candidates.length === 0) {
        console.log('[MapView] no building at click (max radius:', maxRadiusMeters.toFixed(0), 'm)')
      }
      else if (candidates.length === 1) {
        console.log('[MapView] building at click:', candidates[0].id, candidates[0].building_name)
        emit('markerClick', candidates[0])
      }
      else {
        buildingPickerCandidates.value = candidates
        showBuildingPicker.value = true
      }
    })

    // Drawing Manager for polygon filter (mode toggled via drawPolygonActive)
    drawingManager.value = new google.maps.drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      map: map.value,
    })
    overlaycompleteListener = google.maps.event.addListener(
      drawingManager.value,
      'overlaycomplete',
      (e: google.maps.drawing.OverlayCompleteEvent) => {
        if (e.type !== google.maps.drawing.OverlayType.POLYGON || !e.overlay) {
          return
        }
        const path: { lat: number; lng: number }[] = []
        e.overlay.getPath().forEach((latLng: google.maps.LatLng) => {
          path.push({ lat: latLng.lat(), lng: latLng.lng() })
        })
        e.overlay.setMap(null)
        if (path.length >= 3) {
          mappingStore.setPolygon(path)
        }
      },
    )

    // Bounds-based fetch: on map idle (pan/zoom finished), send viewport bounds and refetch
    idleListener = google.maps.event.addListener(map.value, 'idle', () => {
      if (idleDebounceTimer) {
        clearTimeout(idleDebounceTimer)
      }
      idleDebounceTimer = setTimeout(() => {
        idleDebounceTimer = null
        const bounds = map.value?.getBounds()
        if (!bounds) {
          return
        }
        const ne = bounds.getNorthEast()
        const sw = bounds.getSouthWest()
        const minLat = sw.lat()
        const minLng = sw.lng()
        const maxLat = ne.lat()
        const maxLng = ne.lng()
        mappingStore.setMapBounds({ minLat, minLng, maxLat, maxLng })
        mappingStore.fetchBuildings()
      }, IDLE_DEBOUNCE_MS)
    })

    isMapLoaded.value = true
    updateMarkers()
    updateCircle()
    updatePOIMarkers()
    updatePOICircles()
    updateFilterPolygonOverlay()
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
    updateCircle()
    fitPOIBounds()
  }
})

// Toggle Drawing Manager polygon mode when draw polygon is active
watch(() => drawPolygonActive.value, () => {
  if (!drawingManager.value) {
    return
  }
  drawingManager.value.setDrawingMode(
    drawPolygonActive.value ? google.maps.drawing.OverlayType.POLYGON : null,
  )
})

// Render stored polygon overlay when filters.polygon changes
watch(() => filterPolygon.value, () => {
  if (isMapLoaded.value) {
    updateFilterPolygonOverlay()
  }
}, { deep: true })

/** Max click radius in meters from current zoom and map size (fixed pixel radius → meters). */
function getClickRadiusMeters(): number {
  if (!map.value || !mapContainer.value) {
    return FALLBACK_MAX_RADIUS_METERS
  }
  const bounds = map.value.getBounds()
  if (!bounds) {
    return FALLBACK_MAX_RADIUS_METERS
  }
  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()
  const horizontalSpanMeters = google.maps.geometry.spherical.computeDistanceBetween(
    sw,
    new google.maps.LatLng(sw.lat(), ne.lng()),
  )
  const widthPx = mapContainer.value.offsetWidth || 256
  const metersPerPixel = horizontalSpanMeters / widthPx
  const radiusMeters = CLICK_MAX_RADIUS_PX * metersPerPixel
  return radiusMeters
}

/** Resolve map click to all buildings at the same position (nearest within max radius in meters). */
function findBuildingAtClick(latLng: google.maps.LatLng, maxRadiusMeters: number): MappingBuilding[] {
  const buildings = props.buildings || []
  console.log('[MapView] findBuildingAtClick: buildings count =', buildings.length, 'maxRadiusMeters =', maxRadiusMeters)
  let dMinMeters = Infinity
  for (const b of buildings) {
    const lat = b.coordinates?.lat ?? b.latitude
    const lng = b.coordinates?.lng ?? b.longitude
    const buildingLatLng = new google.maps.LatLng(lat, lng)
    const distMeters = google.maps.geometry.spherical.computeDistanceBetween(latLng, buildingLatLng)
    if (distMeters < dMinMeters) {
      dMinMeters = distMeters
    }
  }
  if (dMinMeters > maxRadiusMeters) {
    if (buildings.length > 0) {
      console.log('[MapView] findBuildingAtClick: no match, closest ~', dMinMeters.toFixed(0), 'm away (max:', maxRadiusMeters.toFixed(0), 'm)')
    }
    return []
  }
  const samePosition: MappingBuilding[] = []
  for (const b of buildings) {
    const lat = b.coordinates?.lat ?? b.latitude
    const lng = b.coordinates?.lng ?? b.longitude
    const buildingLatLng = new google.maps.LatLng(lat, lng)
    const distMeters = google.maps.geometry.spherical.computeDistanceBetween(latLng, buildingLatLng)
    if (distMeters <= dMinMeters + SAME_POSITION_EPSILON_METERS) {
      samePosition.push(b)
    }
  }
  console.log('[MapView] findBuildingAtClick: match count =', samePosition.length, '~', dMinMeters.toFixed(0), 'm away')
  return samePosition
}

function closeBuildingPicker() {
  showBuildingPicker.value = false
  buildingPickerCandidates.value = []
}

function selectBuildingFromPicker(building: MappingBuilding) {
  emit('markerClick', building)
  closeBuildingPicker()
}

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
        clickable: false, // Clicks pass through to map; single map-level listener resolves building
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

function updateFilterPolygonOverlay() {
  if (!map.value) {
    return
  }
  if (filterPolygonOverlay.value) {
    filterPolygonOverlay.value.setMap(null)
    filterPolygonOverlay.value = null
  }
  const path = filterPolygon.value
  if (path && path.length >= 3) {
    const gmPath = path.map(p => new google.maps.LatLng(p.lat, p.lng))
    filterPolygonOverlay.value = new google.maps.Polygon({
      paths: gmPath,
      strokeColor: '#1a73e8',
      strokeOpacity: 1,
      strokeWeight: 2,
      fillColor: '#1a73e8',
      fillOpacity: 0.2,
      map: map.value,
    })
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
  if (idleDebounceTimer) {
    clearTimeout(idleDebounceTimer)
    idleDebounceTimer = null
  }
  if (idleListener) {
    google.maps.event.removeListener(idleListener)
    idleListener = null
  }
  if (mapClickListener) {
    google.maps.event.removeListener(mapClickListener)
    mapClickListener = null
  }
  if (overlaycompleteListener) {
    google.maps.event.removeListener(overlaycompleteListener)
    overlaycompleteListener = null
  }
  if (drawingManager.value) {
    drawingManager.value.setMap(null)
    drawingManager.value = null
  }
  if (filterPolygonOverlay.value) {
    filterPolygonOverlay.value.setMap(null)
    filterPolygonOverlay.value = null
  }
  markers.value.forEach(marker => marker.setMap(null))
  poiPointMarkers.value.forEach(marker => marker.setMap(null))
  poiCircles.value.forEach(c => c.setMap(null))
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

    <!-- Multiple buildings at same position: pick one -->
    <div
      v-if="showBuildingPicker && buildingPickerCandidates.length > 1"
      class="building-picker-backdrop"
      role="dialog"
      aria-label="Select a building"
      @click.self="closeBuildingPicker"
    >
      <VCard
        class="building-picker-card"
        @click.stop
      >
        <VCardTitle class="text-subtitle-1">
          Multiple buildings at this location
        </VCardTitle>
        <VList density="compact">
          <VListItem
            v-for="b in buildingPickerCandidates"
            :key="b.id"
            :title="b.building_name"
            :subtitle="b.building_type || undefined"
            clickable
            @click="selectBuildingFromPicker(b)"
          />
        </VList>
        <VCardActions>
          <VSpacer />
          <VBtn
            variant="text"
            size="small"
            @click="closeBuildingPicker"
          >
            Cancel
          </VBtn>
        </VCardActions>
      </VCard>
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

.building-picker-backdrop {
  position: absolute;
  inset: 0;
  z-index: 1001;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  background-color: rgba(0, 0, 0, 0.3);
}

.building-picker-card {
  min-width: 280px;
  max-width: 360px;
  max-height: 70vh;
  overflow: auto;
}
</style>

