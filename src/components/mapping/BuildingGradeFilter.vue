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

// Transform backend grade_resource array to autocomplete format
const items = computed(() => {
  const backendGrades = buildingStore.filterOptions?.grade_resource || []
  
  // Map backend values to autocomplete format
  // Backend returns array of strings like ['Premium', 'Grade A', 'Grade B', ...]
  return backendGrades.map(grade => ({
    title: grade,
    value: grade,
  }))
})

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: string[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Building Grade</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select building grade(s)"
      placeholder="Choose grade(s)..."
      clearable
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
    />
  </div>
</template>

