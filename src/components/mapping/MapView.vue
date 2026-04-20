<script setup lang="ts">
import { Loader } from '@googlemaps/js-api-loader'

// NOTE: MarkerClusterer groups nearby markers into clusters for better performance
// Uncomment the line below to re-enable marker clustering
// import { MarkerClusterer } from '@googlemaps/markerclusterer'
import { useMappingStore } from '@/stores/mapping'
import { getMarkerIconConfig } from '@/utils/markerUtils'
import type { MappingBuilding, MappingFilters } from '@/types/mapping'
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

/** Imperative pool of POI radius circles; never destroyed, only repositioned/hidden (prevents zoom reappear) */
const poiCirclePool: google.maps.Circle[] = []
const drawingManager = ref<google.maps.drawing.DrawingManager | null>(null)
const filterPolygonOverlay = ref<google.maps.Polygon | null>(null)

/** Drawing Manager's completed overlay; kept so we can remove it again if it reappears on zoom */
let lastDrawingManagerOverlay: google.maps.Polygon | null = null
let overlaycompleteListener: google.maps.MapsEventListener | null = null
let idleListener: google.maps.MapsEventListener | null = null
let zoomChangedListener: google.maps.MapsEventListener | null = null
let zoomResizeRafId: number | null = null
let currentZoom: number = ZOOM_LEVEL
const IDLE_DEBOUNCE_MS = 350
let idleDebounceTimer: ReturnType<typeof setTimeout> | null = null
const DEBUG_POLYGON = true // set false to disable polygon overlay debug logs
// Buildings within this many meters are "same position" (multi-building picker)
const SAME_POSITION_EPSILON_METERS = 10

const mappingStore = useMappingStore()

const isMapLoaded = ref(false)
const showBuildingPicker = ref(false)
const buildingPickerCandidates = ref<MappingBuilding[]>([])
const selectedPOIs = computed(() => mappingStore.selectedPOIs)
const drawPolygonActive = computed(() => mappingStore.drawPolygonActive)
const filterPolygon = computed(() => mappingStore.filters.polygon)

/** Center marker only when radius > 0 and no POIs selected */
const showCenterMarker = computed(
  () => (Number(mappingStore.radius) || 0) > 0 && mappingStore.selectedPOIs.length === 0,
)

// Initialize Google Maps
onMounted(async () => {
  if (!mapContainer.value)
    return

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
      streetViewControl: false,
    })

    currentZoom = map.value.getZoom() ?? ZOOM_LEVEL

    // Resize pooled markers when zoom changes. rAF-throttled so rapid
    // scroll/pinch events don't trigger a setIcon storm per frame.
    zoomChangedListener = google.maps.event.addListener(map.value, 'zoom_changed', () => {
      if (!map.value)
        return
      currentZoom = map.value.getZoom() ?? currentZoom
      if (zoomResizeRafId !== null)
        return
      zoomResizeRafId = requestAnimationFrame(() => {
        zoomResizeRafId = null
        applyZoomToMarkers(currentZoom)
      })
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
        if (e.type !== google.maps.drawing.OverlayType.POLYGON || !e.overlay)
          return

        const path: { lat: number; lng: number }[] = []

        ;(e.overlay as google.maps.Polygon).getPath().forEach((latLng: google.maps.LatLng) => {
          path.push({ lat: latLng.lat(), lng: latLng.lng() })
        })
        lastDrawingManagerOverlay = e.overlay as google.maps.Polygon
        e.overlay.setMap(null)
        if (DEBUG_POLYGON)
          console.log('[MapView polygon] overlaycomplete: path length=', path.length, 'lastDrawingManagerOverlay set, setMap(null) called')

        if (path.length >= 3)
          mappingStore.setPolygon(path)
      },
    )

    // Bounds-based fetch: on map idle (pan/zoom finished), send viewport bounds and refetch
    idleListener = google.maps.event.addListener(map.value, 'idle', () => {
      if (idleDebounceTimer)
        clearTimeout(idleDebounceTimer)

      idleDebounceTimer = setTimeout(() => {
        idleDebounceTimer = null

        const bounds = map.value?.getBounds()
        if (!bounds)
          return

        const ne = bounds.getNorthEast()
        const sw = bounds.getSouthWest()
        const minLat = sw.lat()
        const minLng = sw.lng()
        const maxLat = ne.lat()
        const maxLng = ne.lng()

        mappingStore.setMapBounds({ minLat, minLng, maxLat, maxLng })
        mappingStore.fetchBuildings()

        // Re-sync overlays with store so cleared polygon/radius don't reappear on zoom
        if (DEBUG_POLYGON)
          console.log('[MapView polygon] idle: calling updateFilterPolygonOverlay(), store polygon=', mappingStore.filters.polygon ? `${mappingStore.filters.polygon.length} points` : 'undefined')

        updateFilterPolygonOverlay()
      }, IDLE_DEBOUNCE_MS)
    })

    isMapLoaded.value = true
    updateMarkers()
    updatePOIMarkers()
    updatePOICircles()
    updateFilterPolygonOverlay()
  }
  catch (error) {
    console.error('Error loading Google Maps:', error)
  }
})

// Update markers when buildings change (create new markers for accumulated, set visibility from current response)
watch(() => props.buildings, () => {
  if (isMapLoaded.value)
    updateMarkers()
})

// Update center when it changes
watch(() => props.center, () => {
  if (map.value && isMapLoaded.value)
    map.value.setCenter(props.center)
})

// Watch selected POIs: update dot markers, circles, and fit bounds
watch(() => selectedPOIs.value, () => {
  if (isMapLoaded.value) {
    updatePOIMarkers()
    updatePOICircles()
    fitPOIBounds()
  }
}, { deep: true })

// Watch radius changes to update POI circles
watch(() => props.radius, () => {
  if (isMapLoaded.value)
    updatePOICircles()
})

// Toggle Drawing Manager polygon mode when draw polygon is active
watch(() => drawPolygonActive.value, () => {
  if (!drawingManager.value)
    return

  drawingManager.value.setDrawingMode(
    drawPolygonActive.value ? google.maps.drawing.OverlayType.POLYGON : null,
  )
})

// Render stored polygon overlay when filters.polygon changes
watch(() => filterPolygon.value, () => {
  if (isMapLoaded.value) {
    if (DEBUG_POLYGON)
      console.log('[MapView polygon] watcher: filterPolygon changed, calling updateFilterPolygonOverlay(), path=', filterPolygon.value ? `${filterPolygon.value.length} points` : 'undefined')

    updateFilterPolygonOverlay()
  }
}, { deep: true })

// When a saved polygon is loaded, fit map bounds to it once.
// Uses a monotonic counter so switching directly between saved polygons (without clearing
// in between) reliably triggers this watcher, rather than relying on a boolean flag
// whose false→true→false toggle is sensitive to Vue's dependency-tracking order.
watch(
  () => mappingStore.fitBoundsToPolygon,
  () => {
    const polygon = filterPolygon.value
    if (!map.value || !polygon || polygon.length < 3)
      return

    const bounds = new google.maps.LatLngBounds()
    for (const p of polygon)
      bounds.extend({ lat: p.lat, lng: p.lng })
    if (!bounds.isEmpty())
      map.value.fitBounds(bounds, 50)
  },
)

/**
 * LCD presence priority for picking the representative marker when multiple buildings share a position.
 * Lower number = higher priority. The representative's own marker (color + letter) is shown; others are hidden.
 */
const LCD_PRESENCE_PRIORITY: Record<string, number> = {
  TMN: 1,
  CoExist: 2,
  Competitor: 3,
  Opportunity: 4,
}
const LCD_PRESENCE_COLORS: Record<string, string> = {
  TMN: '#0b97f3',
  Competitor: '#913c92',
  CoExist: '#5ecce0',
  Opportunity: '#8d91a9',
}

function getLcdPresencePriority(status: string | null): number {
  return status ? (LCD_PRESENCE_PRIORITY[status] ?? 999) : 999
}

function lcdPresenceColor(status: string | null): string {
  return status ? (LCD_PRESENCE_COLORS[status] ?? '#8d91a9') : '#8d91a9'
}

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
    if (distMeters <= SAME_POSITION_EPSILON_METERS)
      samePosition.push(b)
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

/**
 * Resize every pooled building marker to match the current zoom level.
 * Regenerates the full icon (including the SVG data URL, whose natural width/height
 * track the target display size) so Google Maps keeps natural == display size —
 * this avoids clipping and hit-box drift when zooming.
 */
function applyZoomToMarkers(zoom: number) {
  const installation = props.filters.installation || []

  for (const { marker, building } of Object.values(markersByBuildingId.value)) {
    const iconConfig = getMarkerIconConfig(building, installation, props.reporting || false, zoom)
    if (iconConfig)
      marker.setIcon(iconConfig)
  }
}

/**
 * For each position group of currently visible buildings, pick the representative building
 * with the highest LCD presence priority (TMN > CoExist > Competitor > Opportunity).
 * Returns a set of building IDs to hide (the non-winners in each multi-building group).
 */
function computeHiddenInGroupIds(): Set<string> {
  const visibleBuildings = props.buildings || []
  const assigned = new Set<string>()
  const hidden = new Set<string>()

  for (const building of visibleBuildings) {
    const id = String(building.id)
    if (assigned.has(id))
      continue
    const group = getBuildingsAtPosition(building)
    for (const b of group)
      assigned.add(String(b.id))
    if (group.length <= 1)
      continue

    // Winner = lowest priority number (tie-break by first occurrence)
    let winner = group[0]
    let winnerPrio = getLcdPresencePriority(winner.lcd_presence_status)
    for (let i = 1; i < group.length; i++) {
      const prio = getLcdPresencePriority(group[i].lcd_presence_status)
      if (prio < winnerPrio) {
        winner = group[i]
        winnerPrio = prio
      }
    }

    for (const b of group) {
      if (String(b.id) !== String(winner.id))
        hidden.add(String(b.id))
    }
  }

  return hidden
}

function updateMarkers() {
  if (!map.value)
    return

  const visibleIds = new Set((props.buildings || []).map(b => String(b.id)))
  const accumulated = mappingStore.buildingsAccumulatedList
  const installation = props.filters.installation || []
  const hiddenInGroupIds = computeHiddenInGroupIds()

  for (const building of accumulated) {
    const id = String(building.id)
    let entry = markersByBuildingId.value[id]

    if (!entry) {
      const iconConfig = getMarkerIconConfig(building, installation, props.reporting || false, currentZoom)
      if (!iconConfig)
        continue

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

    entry.marker.setVisible(visibleIds.has(id) && !hiddenInGroupIds.has(id))
  }
}

/**
 * POI point markers: pool is never cleared; we hide with setVisible(false) when no POIs.
 * Flattens all selected POIs' points preserving per-POI color.
 */
function updatePOIMarkers() {
  if (!map.value)
    return

  // Flatten all POI points with per-POI color
  interface FlatPoint { lat: number; lng: number; color: string; label: string }
  const allPoints: FlatPoint[] = []
  for (const poi of selectedPOIs.value) {
    for (const point of poi.points) {
      allPoints.push({
        lat: point.latitude,
        lng: point.longitude,
        color: poi.color,
        label: `${poi.brand} - ${point.poi_name ?? ''}`,
      })
    }
  }
  const needCount = allPoints.length

  // Grow pool if needed
  while (poiPointMarkers.value.length < needCount) {
    try {
      const marker = new google.maps.Marker({
        position: { lat: 0, lng: 0 },
        map: map.value,
        visible: false,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 10,
          fillColor: '#ff0000',
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

  // Update each marker: position, color, title, visibility
  for (let i = 0; i < poiPointMarkers.value.length; i++) {
    const marker = poiPointMarkers.value[i]
    if (i < needCount) {
      const p = allPoints[i]

      marker.setPosition({ lat: p.lat, lng: p.lng })
      marker.setIcon({
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: p.color,
        fillOpacity: 1,
        strokeWeight: 2,
        strokeColor: '#000',
      })
      marker.setTitle(p.label)
      marker.setVisible(true)
    }
    else {
      marker.setVisible(false)
    }
  }
}

/**
 * POI radius circles: imperative pool, never destroyed on POI switch so they can't reappear on zoom.
 * Flattens all selected POIs' points preserving per-POI color.
 */
function updatePOICircles() {
  if (!map.value)
    return

  const radiusMeters = (selectedPOIs.value.length > 0 && props.radius > 0) ? props.radius * 1000 : 0

  // Flatten all POI points with per-POI color
  interface FlatCircle { lat: number; lng: number; color: string }
  const allPoints: FlatCircle[] = []
  for (const poi of selectedPOIs.value) {
    for (const point of poi.points)
      allPoints.push({ lat: point.latitude, lng: point.longitude, color: poi.color })
  }

  // Grow pool if needed
  while (poiCirclePool.length < allPoints.length) {
    try {
      const circle = new google.maps.Circle({
        map: map.value,
        center: { lat: 0, lng: 0 },
        radius: 0,
        fillColor: '#ff0000',
        fillOpacity: 0.2,
        strokeWeight: 1,
        strokeOpacity: 1,
        strokeColor: '#ff0000',
        visible: false,
      })

      poiCirclePool.push(circle)
    }
    catch (error) {
      console.error('Error creating POI circle:', error)
      break
    }
  }

  // Update each circle: position, radius, color, visibility
  for (let i = 0; i < poiCirclePool.length; i++) {
    const circle = poiCirclePool[i]
    if (i < allPoints.length) {
      const p = allPoints[i]

      circle.setCenter({ lat: p.lat, lng: p.lng })
      circle.setRadius(radiusMeters)
      circle.setOptions({ fillColor: p.color, strokeColor: p.color })
      circle.setVisible(true)
    }
    else {
      circle.setVisible(false)
      circle.setRadius(0)
    }
  }
}

function updateFilterPolygonOverlay() {
  if (!map.value)
    return

  const path = filterPolygon.value
  const hasPath = path && path.length >= 3

  if (hasPath) {
    const gmPath = path.map(p => new google.maps.LatLng(p.lat, p.lng))
    if (filterPolygonOverlay.value) {
      filterPolygonOverlay.value.setPath(gmPath)
      if (!filterPolygonOverlay.value.getMap())
        filterPolygonOverlay.value.setMap(map.value)
    }
    else {
      if (DEBUG_POLYGON)
        console.log('[MapView polygon] updateFilterPolygonOverlay: creating new polygon, path length=', path.length)

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
    if (DEBUG_POLYGON)
      console.log('[MapView polygon] updateFilterPolygonOverlay: path empty, setting polygon to degenerate path')

    const emptyPath = [
      new google.maps.LatLng(0, 0),
      new google.maps.LatLng(0, 0),
      new google.maps.LatLng(0, 0),
    ]

    filterPolygonOverlay.value.setPath(emptyPath)
    if (!filterPolygonOverlay.value.getMap())
      filterPolygonOverlay.value.setMap(map.value)
  }

  // Ensure Drawing Manager's overlay is also removed if it was re-shown on zoom
  if (lastDrawingManagerOverlay) {
    if (DEBUG_POLYGON)
      console.log('[MapView polygon] updateFilterPolygonOverlay: path empty, clearing lastDrawingManagerOverlay')

    lastDrawingManagerOverlay.setMap(null)
    lastDrawingManagerOverlay = null
  }

  // Force Drawing Manager to drop any internal overlay that may reappear on zoom
  if (drawingManager.value && map.value) {
    drawingManager.value.setMap(null)
    drawingManager.value.setMap(map.value)
  }
  if (DEBUG_POLYGON)
    console.log('[MapView polygon] updateFilterPolygonOverlay: done (no polygon to show), path=', path ? path.length : 'undefined')
}

function fitPOIBounds() {
  if (!map.value || selectedPOIs.value.length === 0)
    return

  const allPoints = selectedPOIs.value.flatMap(poi => poi.points)
  if (allPoints.length === 0)
    return

  try {
    const bounds = new google.maps.LatLngBounds()
    const radiusMeters = props.radius > 0 ? props.radius * 1000 : 0
    const metersPerDegreeLat = 111320

    for (const point of allPoints) {
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

    if (!bounds.isEmpty())
      map.value.fitBounds(bounds, 50)
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
  if (zoomChangedListener) {
    google.maps.event.removeListener(zoomChangedListener)
    zoomChangedListener = null
  }
  if (zoomResizeRafId !== null) {
    cancelAnimationFrame(zoomResizeRafId)
    zoomResizeRafId = null
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
  Object.values(markersByBuildingId.value).forEach(entry => {
    if (entry.clickListener)
      google.maps.event.removeListener(entry.clickListener)

    entry.marker.setMap(null)
  })
  markersByBuildingId.value = {}
  poiPointMarkers.value.forEach(marker => marker.setMap(null))
  poiCirclePool.forEach(circle => circle.setMap(null))
  poiCirclePool.length = 0
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
      v-if="map && selectedPOIs.length === 0"
      :map="map"
      :center="props.center"
      :radius-km="props.radius"
    />
    <!-- Center point: always mounted when no POI (like circle); hide when radius 0 -->
    <MapCenterMarker
      v-if="map && selectedPOIs.length === 0"
      :map="map"
      :position="props.center"
      :visible="showCenterMarker"
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
          >
            <template #append>
              <VChip
                size="x-small"
                :style="{ backgroundColor: lcdPresenceColor(b.lcd_presence_status), color: '#fff' }"
              >
                {{ b.lcd_presence_status ?? 'N/A' }}
              </VChip>
            </template>
          </VListItem>
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
