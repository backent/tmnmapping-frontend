<script setup lang="ts">
import { BUILDING_TYPES } from '@/utils/mappingConstants'
import type { BuildingType } from '@/types/mapping'

interface Props {
  modelValue: BuildingType[]
}

interface Emits {
  (e: 'update:modelValue', value: BuildingType[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const items = [
  { name: 'Apartment', value: BUILDING_TYPES.APARTMENT },
  { name: 'Office', value: BUILDING_TYPES.OFFICE },
  { name: 'Hotel', value: BUILDING_TYPES.HOTEL },
  { name: 'Retail', value: BUILDING_TYPES.RETAIL },
  { name: 'Others', value: BUILDING_TYPES.OTHER },
]

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

