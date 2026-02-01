<script setup lang="ts">
/**
 * Declarative center marker overlay for single-location radius mode.
 * Only mounts when map and position are set; marker is created on mount and destroyed on unmount.
 */
interface Props {
  map: google.maps.Map | null
  position: { lat: number; lng: number }
}

const props = defineProps<Props>()

const markerInstance = ref<google.maps.Marker | null>(null)

function createMarker() {
  if (!props.map) return
  markerInstance.value = new google.maps.Marker({
    position: props.position,
    map: props.map,
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
  (pos) => {
    if (markerInstance.value && pos) {
      markerInstance.value.setPosition(pos)
    }
  },
  { deep: true },
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
