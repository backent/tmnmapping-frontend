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

// Transform backend building_status array to component format
const items = computed(() => {
  const backendStatuses = buildingStore.filterOptions?.building_status || []
  
  // Map backend values to component format
  // Backend returns array of strings like ['Project Created', 'First Meeting', ...]
  return backendStatuses.map(status => ({
    name: status,
    value: status,
  }))
})

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <FilterGroup
    label="Progress"
    :items="items"
    :model-value="selected"
    :badge-count="selected.length"
    @update:model-value="selected = $event"
  />
</template>

