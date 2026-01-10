<script setup lang="ts">
import { PROGRESS_OPTIONS } from '@/utils/mappingConstants'

interface Props {
  modelValue: string[]
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <FilterGroup
    label="Progress"
    :items="PROGRESS_OPTIONS"
    :model-value="selected"
    :badge-count="selected.length"
    @update:model-value="selected = $event"
  />
</template>

