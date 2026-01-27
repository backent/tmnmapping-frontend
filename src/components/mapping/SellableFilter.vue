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

// Transform backend sellable array to component format
const items = computed(() => {
  const backendSellable = buildingStore.filterOptions?.sellable || []
  
  // Map backend values to component format
  // Backend returns array of strings like ['sell', 'not_sell']
  return backendSellable.map(sellable => ({
    name: sellable === 'sell' ? 'Sell' : sellable === 'not_sell' ? 'Not Sell' : sellable,
    value: sellable,
  }))
})

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <FilterGroup
    label="Sellable"
    :items="items"
    :model-value="selected"
    :badge-count="selected.length"
    :max-visible="4"
    @update:model-value="selected = $event"
  />
</template>
