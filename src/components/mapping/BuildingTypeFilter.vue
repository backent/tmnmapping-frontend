<script setup lang="ts">
import { onMounted } from 'vue'
import { useBuildingStore } from '@/stores/building'
import type { BuildingType } from '@/types/mapping'

interface Props {
  modelValue: BuildingType[]
}

interface Emits {
  (e: 'update:modelValue', value: BuildingType[]): void
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

// Transform backend building_type array to component format
const items = computed(() => {
  const backendTypes = buildingStore.filterOptions?.building_type || []
  
  // Map backend values to component format
  // Backend returns array of strings like ['Apartment', 'Office', 'Hotel', ...]
  return backendTypes.map(type => ({
    name: type,
    value: type as BuildingType,
  }))
})

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <FilterGroup
    label="Building Type"
    :items="items"
    :model-value="selected"
    :badge-count="selected.length"
    @update:model-value="selected = $event"
  />
</template>

