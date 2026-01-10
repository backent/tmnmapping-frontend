<script setup lang="ts">
import { BUILDING_GRADES } from '@/utils/mappingConstants'
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

const items = computed(() => {
  return mappingStore.filterOptions?.buildingGrades || BUILDING_GRADES
})

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <FilterGroup
    label="Building Grade"
    :items="items"
    :model-value="selected"
    :badge-count="selected.length"
    :max-visible="4"
    @update:model-value="selected = $event"
  />
</template>

