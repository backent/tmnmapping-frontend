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
  if (!buildingStore.filterOptions)
    await buildingStore.fetchFilterOptions()
})

// Transform backend building_status array to autocomplete format
const items = computed(() => {
  const backendStatuses = buildingStore.filterOptions?.building_status || []

  // Map backend values to autocomplete format
  // Backend returns array of strings like ['Project Created', 'First Meeting', ...]
  return backendStatuses.map(status => ({
    title: status,
    value: status,
  }))
})

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: string[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Progress</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select progress status(es)"
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
