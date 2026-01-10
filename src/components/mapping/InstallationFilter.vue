<script setup lang="ts">
import { INSTALLATION_STATUS } from '@/utils/mappingConstants'
import type { InstallationStatus } from '@/types/mapping'

interface Props {
  modelValue: InstallationStatus[]
}

interface Emits {
  (e: 'update:modelValue', value: InstallationStatus[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const items = [
  { name: 'Complete', value: INSTALLATION_STATUS.COMPLETE },
  { name: 'Incomplete', value: INSTALLATION_STATUS.INCOMPLETE },
  { name: 'Need Request', value: INSTALLATION_STATUS.NEED_REQUEST },
]

const selected = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <FilterGroup
    label="Installation"
    :items="items"
    :model-value="selected"
    :badge-count="selected.length"
    @update:model-value="selected = $event"
  />
</template>

