<script setup lang="ts">
import { Loader } from '@googlemaps/js-api-loader'
// NOTE: MarkerClusterer groups nearby markers into clusters for better performance
// Uncomment the line below to re-enable marker clustering
// import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { useMappingStore } from '@/stores/mapping'
import { getMarkerIconConfig } from '@/utils/markerUtils'
import type { MappingBuilding } from '@/types/mapping'
import type { MappingFilters } from '@/types/mapping'
import MapRadiusCircle from '@/components/mapping/MapRadiusCircle.vue'
import MapCenterMarker from '@/components/mapping/MapCenterMarker.vue'

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

const ZOOM_LEVEL = 14
const mapContainer = ref<HTMLDivElement>()
const map = ref<google.maps.Map | null>(null)
/** Marker pool by building id; markers are never destroyed on filter/pan, only visibility is updated */
const markersByBuildingId = ref<Record<string, { marker: google.maps.Marker; building: MappingBuilding; clickListener: google.maps.MapsEventListener }>>({})
// NOTE: Clusterer disabled - uncomment to re-enable marker clustering
// const clusterer = ref<MarkerClusterer | null>(null)
const poiPointMarkers = ref<google.maps.Marker[]>([])
const drawingManager = ref<google.maps.drawing.DrawingManager | null>(null)
const filterPolygonOverlay = ref<google.maps.Polygon | null>(null)
/** Drawing Manager's completed overlay; kept so we can remove it again if it reappears on zoom */
let lastDrawingManagerOverlay: google.maps.Polygon | null = null
let overlaycompleteListener: google.maps.MapsEventListener | null = null
let idleListener: google.maps.MapsEventListener | null = null
const IDLE_DEBOUNCE_MS = 350
let idleDebounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBUG_POLYGON = true // set false to disable polygon overlay debug logs
// Buildings within this many meters are "same position" (multi-building picker)
const SAME_POSITION_EPSILON_METERS = 100

const mappingStore = useMappingStore()

const isMapLoaded = ref(false)
const showBuildingPicker = ref(false)
const buildingPickerCandidates = ref<MappingBuilding[]>([])
const selectedPOI = computed(() => mappingStore.selectedPOI)
const drawPolygonActive = computed(() => mappingStore.drawPolygonActive)
const filterPolygon = computed(() => mappingStore.filters.polygon)

/** Center marker only when radius > 0 (read from store so visibility updates when radius is set to 0) */
const showCenterMarker = computed(
  () => (Number(mappingStore.radius) || 0) > 0 && !mappingStore.selectedPOI,
)

/** When POI is cleared we keep showing circles with radius 0 (don't unmount) so they can't reappear on zoom */
const lastPOIPoints = ref<{ lat: number; lng: number }[]>([])
watch(selectedPOI, () => {
  if (selectedPOI.value?.points?.length) {
    lastPOIPoints.value = selectedPOI.value.points.map(p => ({ lat: p.latitude, lng: p.longitude }))
  }
}, { immediate: true })

const poiCircleData = computed(() => {
  if (selectedPOI.value?.points?.length) {
    return {
      centers: selectedPOI.value.points.map(p => ({ lat: p.latitude, lng: p.longitude })),
      radiusKm: props.radius,
      color: selectedPOI.value.color,
    }
  }
  return {
    centers: lastPOIPoints.value,
    radiusKm: 0,
    color: '#ff0000',
  }
})

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
      zoom: ZOOM_LEVEL,
      disableDoubleClickZoom: true,
      clickableIcons: false, // Disable interaction with Google POI (restaurants, etc.),
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
        lastDrawingManagerOverlay = e.overlay as google.maps.Polygon
        e.overlay.setMap(null)
        if (DEBUG_POLYGON) {
          console.log('[MapView polygon] overlaycomplete: path length=', path.length, 'lastDrawingManagerOverlay set, setMap(null) called')
        }
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
        // Re-sync overlays with store so cleared polygon/radius don't reappear on zoom
        if (DEBUG_POLYGON) {
          console.log('[MapView polygon] idle: calling updateFilterPolygonOverlay(), store polygon=', mappingStore.filters.polygon ? `${mappingStore.filters.polygon.length} points` : 'undefined')
        }
        updateFilterPolygonOverlay()
      }, IDLE_DEBOUNCE_MS)
    })

    isMapLoaded.value = true
    updateMarkers()
    updatePOIMarkers()
    updateFilterPolygonOverlay()
  }
  catch (error) {
    console.error('Error loading Google Maps:', error)
  }
})

// Update markers when buildings change (create new markers for accumulated, set visibility from current response)
watch(() => props.buildings, () => {
  if (isMapLoaded.value) {
    updateMarkers()
  }
})

// Update center when it changes
watch(() => props.center, () => {
  if (map.value && isMapLoaded.value) {
    map.value.setCenter(props.center)
  }
})

// Watch selected POI (radius circles are declarative components; no imperative update)
watch(() => selectedPOI.value, () => {
  if (isMapLoaded.value) {
    updatePOIMarkers()
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
    if (DEBUG_POLYGON) {
      console.log('[MapView polygon] watcher: filterPolygon changed, calling updateFilterPolygonOverlay(), path=', filterPolygon.value ? `${filterPolygon.value.length} points` : 'undefined')
    }
    updateFilterPolygonOverlay()
  }
}, { deep: true })

// When a saved polygon is loaded, fit map bounds to it once
watch(
  () => mappingStore.fitBoundsToPolygon && filterPolygon.value && filterPolygon.value.length >= 3,
  shouldFit => {
    if (!shouldFit || !map.value || !filterPolygon.value?.length) {
      return
    }
    const bounds = new google.maps.LatLngBounds()
    for (const p of filterPolygon.value)
      bounds.extend({ lat: p.lat, lng: p.lng })
    if (!bounds.isEmpty())
      map.value.fitBounds(bounds, 50)
    mappingStore.setFitBoundsToPolygon(false)
  },
)

/** All visible buildings at or near the given building's position (for multi-building picker). */
function getBuildingsAtPosition(building: MappingBuilding): MappingBuilding[] {
  const buildings = props.buildings || []
  const lat = building.coordinates?.lat ?? building.latitude
  const lng = building.coordinates?.lng ?? building.longitude
  const refLatLng = new google.maps.LatLng(lat, lng)
  const samePosition: MappingBuilding[] = []
  for (const b of buildings) {
    const bLat = b.coordinates?.lat ?? b.latitude
    const bLng = b.coordinates?.lng ?? b.longitude
    const buildingLatLng = new google.maps.LatLng(bLat, bLng)
    const distMeters = google.maps.geometry.spherical.computeDistanceBetween(refLatLng, buildingLatLng)
    if (distMeters <= SAME_POSITION_EPSILON_METERS) {
      samePosition.push(b)
    }
  }
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

function updateMarkers() {
  if (!map.value) {
    return
  }

  const visibleIds = new Set((props.buildings || []).map(b => String(b.id)))
  const accumulated = mappingStore.buildingsAccumulatedList
  const installation = props.filters.installation || []

  for (const building of accumulated) {
    const id = String(building.id)
    let entry = markersByBuildingId.value[id]

    if (!entry) {
      const iconConfig = getMarkerIconConfig(building, installation, props.reporting || false)
      if (!iconConfig) {
        continue
      }
      try {
        const marker = new google.maps.Marker({
          position: {
            lat: building.coordinates.lat,
            lng: building.coordinates.lng,
          },
          icon: iconConfig,
          title: building.building_name,
          visible: false,
          optimized: false,
          clickable: true,
        })
        marker.setMap(map.value)
        const clickListener = google.maps.event.addListener(marker, 'click', () => {
          const candidates = getBuildingsAtPosition(building)
          if (candidates.length > 1) {
            buildingPickerCandidates.value = candidates
            showBuildingPicker.value = true
          }
          else {
            emit('markerClick', building)
          }
        })
        entry = { marker, building, clickListener }
        markersByBuildingId.value[id] = entry
      }
      catch (error) {
        console.error('Error creating marker:', error)
        continue
      }
    }

    entry.marker.setVisible(visibleIds.has(id))
  }
}

/**
 * POI point markers: pool is never cleared; we hide with setVisible(false) when no POI
 * so they don't reappear on zoom (same pattern as center marker and radius circle).
 */
function updatePOIMarkers() {
  if (!map.value) {
    return
  }

  const points = selectedPOI.value?.points ?? []
  const poiColor = selectedPOI.value?.color ?? '#ff0000'
  const poiName = selectedPOI.value?.name ?? ''
  const needCount = points.length

  // Ensure pool has enough markers; create new ones only when needed
  while (poiPointMarkers.value.length < needCount) {
    try {
      const marker = new google.maps.Marker({
        position: { lat: 0, lng: 0 },
        map: map.value,
        visible: false,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: poiColor,
          fillOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#000',
        },
        title: '',
        zIndex: 999,
      })
      poiPointMarkers.value.push(marker)
    }
    catch (error) {
      console.error('Error creating POI point marker:', error)
      break
    }
  }

  // Update each marker: position, icon color, title, and visibility
  for (let i = 0; i < poiPointMarkers.value.length; i++) {
    const marker = poiPointMarkers.value[i]
    if (i < needCount) {
      const point = points[i]
      marker.setPosition({ lat: point.latitude, lng: point.longitude })
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: poiColor,
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#000',
      })
      marker.setTitle(`${poiName} - ${point.place_name ?? ''}`)
      marker.setVisible(true)
    }
    else {
      marker.setVisible(false)
    }
  }
}

function updateFilterPolygonOverlay() {
  if (!map.value) {
    return
  }
  const path = filterPolygon.value
  const hasPath = path && path.length >= 3

  if (hasPath) {
    const gmPath = path.map(p => new google.maps.LatLng(p.lat, p.lng))
    if (filterPolygonOverlay.value) {
      filterPolygonOverlay.value.setPath(gmPath)
      if (!filterPolygonOverlay.value.getMap()) {
        filterPolygonOverlay.value.setMap(map.value)
      }
    }
    else {
      if (DEBUG_POLYGON) {
        console.log('[MapView polygon] updateFilterPolygonOverlay: creating new polygon, path length=', path.length)
      }
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
    return
  }

  // No path (cleared): keep polygon on map with degenerate path so it doesn't reappear on zoom
  if (filterPolygonOverlay.value) {
    if (DEBUG_POLYGON) {
      console.log('[MapView polygon] updateFilterPolygonOverlay: path empty, setting polygon to degenerate path')
    }
    const emptyPath = [
      new google.maps.LatLng(0, 0),
      new google.maps.LatLng(0, 0),
      new google.maps.LatLng(0, 0),
    ]
    filterPolygonOverlay.value.setPath(emptyPath)
    if (!filterPolygonOverlay.value.getMap()) {
      filterPolygonOverlay.value.setMap(map.value)
    }
  }

  // Ensure Drawing Manager's overlay is also removed if it was re-shown on zoom
  if (lastDrawingManagerOverlay) {
    if (DEBUG_POLYGON) {
      console.log('[MapView polygon] updateFilterPolygonOverlay: path empty, clearing lastDrawingManagerOverlay')
    }
    lastDrawingManagerOverlay.setMap(null)
    lastDrawingManagerOverlay = null
  }
  // Force Drawing Manager to drop any internal overlay that may reappear on zoom
  if (drawingManager.value && map.value) {
    drawingManager.value.setMap(null)
    drawingManager.value.setMap(map.value)
  }
  if (DEBUG_POLYGON) {
    console.log('[MapView polygon] updateFilterPolygonOverlay: done (no polygon to show), path=', path ? path.length : 'undefined')
  }
}

function fitPOIBounds() {
  if (!map.value || !selectedPOI.value || selectedPOI.value.points.length === 0) {
    return
  }

  try {
    const bounds = new google.maps.LatLngBounds()
    const radiusMeters = props.radius > 0 ? props.radius * 1000 : 0
    // ~111320 m per degree at equator; lng scale varies by cos(lat)
    const metersPerDegreeLat = 111320

    for (const point of selectedPOI.value.points) {
      const lat = point.latitude
      const lng = point.longitude
      bounds.extend({ lat, lng })
      if (radiusMeters > 0) {
        const degLat = radiusMeters / metersPerDegreeLat
        const degLng = radiusMeters / (metersPerDegreeLat * Math.max(0.01, Math.cos((lat * Math.PI) / 180)))
        bounds.extend({ lat: lat + degLat, lng })
        bounds.extend({ lat: lat - degLat, lng })
        bounds.extend({ lat, lng: lng + degLng })
        bounds.extend({ lat, lng: lng - degLng })
      }
    }

    if (!bounds.isEmpty()) {
      const padding = 50
      map.value.fitBounds(bounds, padding)
    }
  }
  catch (error) {
    console.error('Error fitting POI bounds:', error)
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
  if (lastDrawingManagerOverlay) {
    lastDrawingManagerOverlay.setMap(null)
    lastDrawingManagerOverlay = null
  }
  Object.values(markersByBuildingId.value).forEach((entry) => {
    if (entry.clickListener) {
      google.maps.event.removeListener(entry.clickListener)
    }
    entry.marker.setMap(null)
  })
  markersByBuildingId.value = {}
  poiPointMarkers.value.forEach(marker => marker.setMap(null))
})
</script>

<template>
  <div class="map-wrapper">
    <div
      ref="mapContainer"
      class="map-container"
    />
    <!-- Single-location radius circle (always mounted when no POI; radius 0 = invisible, like oldmapping) -->
    <MapRadiusCircle
      v-if="map && !selectedPOI"
      :map="map"
      :center="props.center"
      :radius-km="props.radius"
    />
    <!-- Center point: always mounted when no POI (like circle); hide when radius 0 -->
    <MapCenterMarker
      v-if="map && !selectedPOI"
      :map="map"
      :position="props.center"
      :visible="showCenterMarker"
    />
    <!-- POI radius circles: when POI selected show circles; when POI cleared keep same circles with radius 0 (don't unmount) -->
    <template v-if="map && poiCircleData.centers.length">
      <MapRadiusCircle
        v-for="(circleCenter, i) in poiCircleData.centers"
        :key="`poi-circle-${i}-${circleCenter.lat}-${circleCenter.lng}`"
        :map="map"
        :center="circleCenter"
        :radius-km="poiCircleData.radiusKm"
        :fill-color="poiCircleData.color"
        :stroke-color="poiCircleData.color"
      />
    </template>
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

