<script setup lang="ts">
import { computed, onMounted } from 'vue'
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

// Transform backend sellable array to autocomplete format with value transformation
const items = computed(() => {
  const backendSellable = buildingStore.filterOptions?.sellable || []
  
  // Map backend values to autocomplete format with transformed titles
  // Backend returns array of strings like ['sell', 'not_sell']
  return backendSellable.map(sellable => ({
    title: sellable === 'sell' ? 'Sell' : sellable === 'not_sell' ? 'Not Sell' : sellable,
    value: sellable,
  }))
})

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: string[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Sellable</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select sellable status(es)"
      placeholder="Choose status(es)..."
      clearable
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
    />
  </div>
</template>
