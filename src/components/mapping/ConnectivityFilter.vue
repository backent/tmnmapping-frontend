<script setup lang="ts">
import { onMounted } from 'vue'
import { useBuildingStore } from '@/stores/building'

interface Props {
  modelValue: string[]
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const buildingStore = useBuildingStore()

// Fetch filter options if not already loaded
onMounted(async () => {
  if (!buildingStore.filterOptions) {
    await buildingStore.fetchFilterOptions()
  }
})

// Transform backend connectivity array to component format
const items = computed(() => {
  const backendConnectivity = buildingStore.filterOptions?.connectivity || []
  
  // Map backend values to component format
  // Backend returns array of strings like ['online', 'manual', 'not_yet_checked']
  return backendConnectivity.map(connectivity => ({
    name: connectivity === 'online' ? 'Online' : connectivity === 'manual' ? 'Manual' : connectivity === 'not_yet_checked' ? 'Not Yet Checked' : connectivity,
    value: connectivity,
  }))
})

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <FilterGroup
    label="Connectivity"
    :items="items"
    :model-value="selected"
    :badge-count="selected.length"
    :max-visible="4"
    @update:model-value="selected = $event"
  />
</template>
