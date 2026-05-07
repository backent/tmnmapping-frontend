<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { BUILDING_TYPE_CODES } from '@/config/buildingType'
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

onMounted(async () => {
  if (!buildingStore.filterOptions)
    await buildingStore.fetchFilterOptions()
})

// Show only types that exist in the DB, ordered by the canonical config so
// the dropdown matches the chip grid order on the same page.
const items = computed(() => {
  const present = new Set(buildingStore.filterOptions?.building_type || [])

  return BUILDING_TYPE_CODES
    .filter(({ name }) => present.has(name))
    .map(({ name }) => ({
      title: name,
      value: name as BuildingType,
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
