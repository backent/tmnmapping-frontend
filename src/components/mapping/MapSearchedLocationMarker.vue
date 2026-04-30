<script setup lang="ts">
import { BASE_MARKER_ZOOM, computeMarkerScale } from '@/utils/markerUtils'

/**
 * Pin marker dropped at the location chosen via LocationFilter autocomplete or a map double-click.
 * Marker is destroyed and recreated whenever `position`/`map` changes; on zoom it stays put and
 * its icon is swapped via setIcon (no recreation), so panning/zooming feels smooth.
 *
 * Sizing follows the same clamped zoom-scale as the building markers (see markerUtils.computeMarkerScale)
 * so the pin shrinks at low zoom and tops out at base size when zooming in.
 */
interface Props {
  map: google.maps.Map | null
  position: { lat: number; lng: number } | null
}

const props = defineProps<Props>()

// Match the building marker's base size (markerUtils.BASE_MARKER_WIDTH/HEIGHT)
// so the highlight pin sits at the same visual scale at every zoom level.
const PIN_BASE_WIDTH = 30
const PIN_BASE_HEIGHT = 40
const PIN_COLOR = '#001440'

// Hole geometry, in 60×80 viewBox units. Cx/Cy=30,30 puts the hole at the
// centre of the teardrop's head (matching the building marker's white circle).
// Tweak HOLE_RADIUS to grow/shrink the hole — must be < 30 (the teardrop's
// head radius) or the cut-out will breach the outline.
const HOLE_CX = 30
const HOLE_CY = 30
const HOLE_RADIUS = 17

function buildIcon(scale: number): google.maps.Icon {
  const width = Math.round(PIN_BASE_WIDTH * scale)
  const height = Math.round(PIN_BASE_HEIGHT * scale)

  // Teardrop + a real transparent hole in the middle. The two subpaths share a
  // single <path> with fill-rule="evenodd" so the inner circle subtracts from
  // the teardrop fill — the map background shows through the hole.
  // Pin tip sits at the bottom of the 60×80 viewBox.
  const r = HOLE_RADIUS
  const holePath = `M${HOLE_CX + r} ${HOLE_CY}a${r} ${r} 0 1 1 -${2 * r} 0 ${r} ${r} 0 0 1 ${2 * r} 0z`
  const teardropPath = 'M30 0C13.431 0 0 13.431 0 30c0 21 30 50 30 50s30-29 30-50C60 13.431 46.569 0 30 0z'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 60 80"><path fill-rule="evenodd" clip-rule="evenodd" d="${teardropPath}${holePath}" fill="${PIN_COLOR}"/></svg>`

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    size: new google.maps.Size(width, height),
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(Math.round(width / 2), height),
  }
}

// Plain variables — Google Maps' Marker is a mutable instance and doesn't need
// (or want) Vue's reactive proxy wrapping it.
let markerInstance: google.maps.Marker | null = null
let zoomListener: google.maps.MapsEventListener | null = null
let zoomRafId: number | null = null

function destroyMarker() {
  if (zoomListener) {
    zoomListener.remove()
    zoomListener = null
  }
  if (zoomRafId !== null) {
    cancelAnimationFrame(zoomRafId)
    zoomRafId = null
  }
  if (markerInstance) {
    markerInstance.setMap(null)
    markerInstance = null
  }
}

watchEffect(() => {
  destroyMarker()
  if (!props.map || !props.position)
    return

  const map = props.map
  const initialScale = computeMarkerScale(map.getZoom() ?? BASE_MARKER_ZOOM)

  markerInstance = new google.maps.Marker({
    position: { lat: props.position.lat, lng: props.position.lng },
    map,
    icon: buildIcon(initialScale),
    zIndex: 1100,
  })

  // rAF-throttled so rapid scroll/pinch zoom doesn't trigger a setIcon storm.
  zoomListener = map.addListener('zoom_changed', () => {
    if (zoomRafId !== null)
      return
    zoomRafId = requestAnimationFrame(() => {
      zoomRafId = null
      if (!markerInstance)
        return
      const scale = computeMarkerScale(map.getZoom() ?? BASE_MARKER_ZOOM)
      markerInstance.setIcon(buildIcon(scale))
    })
  })
})

onBeforeUnmount(destroyMarker)
</script>

<template>
  <!-- No DOM: marker is added to the map by the script -->
</template>
