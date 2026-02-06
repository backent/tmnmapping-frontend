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
  { title: 'TMN', value: 'TMN' },
  { title: 'Competitor', value: 'Competitor' },
  { title: 'CoExist', value: 'CoExist' },
  { title: 'Opportunity', value: 'Opportunity' },
]

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: string[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>LCD Presence</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select LCD presence status(es)"
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
