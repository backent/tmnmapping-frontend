<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useSavedPolygonStore } from '@/stores/savedpolygon'
import { useMappingStore } from '@/stores/mapping'
import type { SavedPolygon } from '@/types/savedpolygon'

const savedPolygonStore = useSavedPolygonStore()
const mappingStore = useMappingStore()

onMounted(async () => {
  if (savedPolygonStore.savedPolygons.length === 0)
    await savedPolygonStore.fetchSavedPolygons({ take: 500 })
})

const items = computed(() => {
  return savedPolygonStore.savedPolygons.map(p => ({
    title: p.name,
    subtitle: p.points.length ? `${p.points.length} points` : '',
    value: p.id,
    raw: p,
  }))
})

const selectedId = ref<number | null>(null)

function pointsToFilterFormat(polygon: SavedPolygon): { lat: number; lng: number }[] {
  const sorted = [...polygon.points].sort((a, b) => a.ord - b.ord)

  return sorted.map(p => ({ lat: p.lat, lng: p.lng }))
}

watch(selectedId, async id => {
  if (id == null) {
    mappingStore.setPolygon(null)

    return
  }
  const polygon = savedPolygonStore.savedPolygons.find(p => p.id === id)
  if (polygon) {
    const path = pointsToFilterFormat(polygon)

    await mappingStore.setPolygon(path)
    mappingStore.setFitBoundsToPolygon(true)
  }
})

// When polygon is cleared elsewhere (e.g. Clear polygon button), clear dropdown selection
watch(
  () => mappingStore.filters.polygon,
  polygon => {
    if (!polygon || polygon.length < 3)
      selectedId.value = null
  },
  { deep: true },
)

async function deletePolygon(id: number, e: Event) {
  e.stopPropagation()

  const polygon = savedPolygonStore.savedPolygons.find(p => p.id === id)
  if (!polygon)
    return
  if (!confirm(`Delete saved polygon "${polygon.name}"?`))
    return
  try {
    await savedPolygonStore.deleteSavedPolygon(id)
    if (selectedId.value === id) {
      selectedId.value = null
      mappingStore.setPolygon(null)
    }
  }
  catch (err) {
    console.error('Failed to delete saved polygon:', err)
  }
}
</script>

<template>
  <VDivider />
  <VSubheader>Saved polygons</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selectedId"
      :items="items"
      item-title="title"
      item-value="value"
      label="Load saved polygon"
      placeholder="Choose a saved polygon..."
      clearable
      variant="outlined"
      density="compact"
      :loading="savedPolygonStore.isLoading"
    >
      <template #item="{ props: itemProps, item }">
        <VListItem v-bind="itemProps">
          <template #append>
            <VBtn
              icon
              size="x-small"
              variant="text"
              color="error"
              @click="deletePolygon(item.value, $event)"
            >
              <VIcon icon="ri-delete-bin-line" />
            </VBtn>
          </template>
        </VListItem>
      </template>
    </VAutocomplete>
    <p class="text-caption text-medium-emphasis mt-1 mb-0">
      Select to apply as filter, or delete from list.
    </p>
  </div>
</template>
