<script setup lang="ts">
import { computed, onMounted } from 'vue'
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

// Transform backend building_type array to autocomplete format
const items = computed(() => {
  const backendTypes = buildingStore.filterOptions?.building_type || []
  
  // Map backend values to autocomplete format
  // Backend returns array of strings like ['Apartment', 'Office', 'Hotel', ...]
  return backendTypes.map(type => ({
    title: type,
    value: type as BuildingType,
  }))
})

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: BuildingType[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Building Type</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select building type(s)"
      placeholder="Choose type(s)..."
      clearable
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
    />
  </div>
</template>

