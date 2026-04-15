<script setup lang="ts">
/**
 * Declarative center marker overlay for single-location radius mode.
 * Stays mounted when no POI (like MapRadiusCircle); visibility toggled when radius is 0.
 * We hide the marker with setVisible(false) instead of removing it, so it never sticks on screen.
 */
interface Props {
  map: google.maps.Map | null
  position: { lat: number; lng: number }

  /** When false, marker is hidden (e.g. radius set to 0 km) */
  visible?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: true,
})

const markerInstance = ref<google.maps.Marker | null>(null)

function createMarker() {
  if (!props.map)
    return
  markerInstance.value = new google.maps.Marker({
    position: props.position,
    map: props.map,
    visible: props.visible,
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

watch(
  () => props.position,
  pos => {
    if (markerInstance.value && pos)
      markerInstance.value.setPosition(pos)
  },
  { deep: true },
)

watch(
  () => props.visible,
  visible => {
    if (markerInstance.value)
      markerInstance.value.setVisible(visible)
  },
  { immediate: true },
)

onMounted(() => {
  createMarker()
})

onBeforeUnmount(() => {
  if (markerInstance.value) {
    markerInstance.value.setMap(null)
    markerInstance.value = null
  }
})
</script>

<template>
  <!-- No DOM: marker is added to the map by the script -->
</template>
