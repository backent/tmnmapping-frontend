<script setup lang="ts">
import { LCD_PRESENCE } from '@/utils/mappingConstants'
import type { LCDPresence } from '@/types/mapping'

interface Props {
  modelValue: LCDPresence[]
}

interface Emits {
  (e: 'update:modelValue', value: LCDPresence[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const items = [
  { name: 'TMN', value: LCD_PRESENCE.TMN },
  { name: 'FMI', value: LCD_PRESENCE.FMI },
  { name: 'DFI', value: LCD_PRESENCE.DFI },
  { name: 'Opportunities', value: LCD_PRESENCE.OPPORTUNITIES },
  { name: 'Other', value: LCD_PRESENCE.OTHER },
]

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
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

