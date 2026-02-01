<script setup lang="ts">
/**
 * Declarative radius circle overlay (aligned with oldmapping GmapCircle).
 * Always mounted when in single-location or POI mode; circle stays on the map and we set
 * radius to 0 when radiusKm is 0 (invisible) instead of unmounting, so it cannot reappear on zoom.
 */
interface Props {
  map: google.maps.Map | null
  center: { lat: number; lng: number }
  radiusKm: number
  fillColor?: string
  strokeColor?: string
}

const props = withDefaults(defineProps<Props>(), {
  fillColor: '#ff0000',
  strokeColor: '#ff0000',
})

const circleInstance = ref<google.maps.Circle | null>(null)

function createCircle() {
  if (!props.map) return
  const radiusMeters = Math.max(0, props.radiusKm * 1000)
  circleInstance.value = new google.maps.Circle({
    center: props.center,
    radius: radiusMeters,
    fillColor: props.fillColor,
    fillOpacity: 0.2,
    strokeWeight: 1,
    strokeOpacity: 1,
    strokeColor: props.strokeColor,
    map: props.map,
  })
}

function updateCircle() {
  if (!circleInstance.value) return
  circleInstance.value.setCenter(props.center)
  circleInstance.value.setRadius(Math.max(0, props.radiusKm * 1000))
}

watch(
  () => [props.center, props.radiusKm] as const,
  () => updateCircle(),
  { deep: true },
)

onMounted(() => {
  createCircle()
})

onBeforeUnmount(() => {
  if (circleInstance.value) {
    circleInstance.value.setMap(null)
    circleInstance.value = null
  }
})
</script>

<template>
  <!-- No DOM: circle is added to the map by the script -->
</template>
