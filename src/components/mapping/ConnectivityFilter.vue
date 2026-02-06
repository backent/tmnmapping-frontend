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

// Transform backend connectivity array to autocomplete format with value transformation
const items = computed(() => {
  const backendConnectivity = buildingStore.filterOptions?.connectivity || []
  
  // Map backend values to autocomplete format with transformed titles
  // Backend returns array of strings like ['online', 'manual', 'not_yet_checked']
  return backendConnectivity.map(connectivity => ({
    title: connectivity === 'online' ? 'Online' : connectivity === 'manual' ? 'Manual' : connectivity === 'not_yet_checked' ? 'Not Yet Checked' : connectivity,
    value: connectivity,
  }))
})

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: string[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Connectivity</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select connectivity status(es)"
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
