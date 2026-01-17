<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: string[]
}

interface Emits {
  (e: 'update:modelValue', value: string[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const items = [
  { name: 'TMN', value: 'TMN' },
  { name: 'Competitor', value: 'Competitor' },
  { name: 'CoExist', value: 'CoExist' },
  { name: 'Opportunity', value: 'Opportunity' },
]

const selected = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
})
</script>

<template>
  <FilterGroup
    label="LCD Presence"
    :items="items"
    :model-value="selected"
    :badge-count="selected.length"
    @update:model-value="selected = $event"
  />
</template>
