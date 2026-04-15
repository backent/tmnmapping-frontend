<script setup lang="ts">
import { computed } from 'vue'
import { useMappingStore } from '@/stores/mapping'

interface Props {
  modelValue: string[]
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const mappingStore = useMappingStore()

// Transform screen types to autocomplete format
// Keep JSON.stringify for value to maintain compatibility with backend
const items = computed(() => {
  // Return empty array if no screen types available
  if (!mappingStore.screenTypes || mappingStore.screenTypes.length === 0)
    return []

  return mappingStore.screenTypes.map(st => ({
    title: st.name,
    value: JSON.stringify(st),
  }))
})

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: string[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Screen Type</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select screen type(s)"
      placeholder="Choose type(s)..."
      clearable
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      :loading="mappingStore.isSearching"
    />
  </div>
</template>
