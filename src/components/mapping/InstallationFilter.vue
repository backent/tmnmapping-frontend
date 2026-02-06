<script setup lang="ts">
import { computed } from 'vue'
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
  { title: 'Complete', value: INSTALLATION_STATUS.COMPLETE },
  { title: 'Incomplete', value: INSTALLATION_STATUS.INCOMPLETE },
  { title: 'Need Request', value: INSTALLATION_STATUS.NEED_REQUEST },
]

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: InstallationStatus[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Installation</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select installation status(es)"
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

