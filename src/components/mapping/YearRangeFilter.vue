<script setup lang="ts">
import { useMappingStore } from '@/stores/mapping'

interface Props {
  modelValue: [number, number]
  reporting?: boolean
}

interface Emits {
  (e: 'update:modelValue', value: [number, number]): void
}

const props = withDefaults(defineProps<Props>(), {
  reporting: false,
})

const emit = defineEmits<Emits>()

const mappingStore = useMappingStore()

const yearRange = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const minYear = computed(() => mappingStore.yearRange[0])
const maxYear = computed(() => mappingStore.yearRange[1])
</script>

<template>
  <VDivider />
  <VSubheader v-if="!reporting">
    Year {{ yearRange[0] }} - {{ yearRange[1] }}
  </VSubheader>
  <VRangeSlider
    v-if="!reporting"
    v-model="yearRange"
    :max="maxYear"
    :min="minYear"
    class="pr-3 pl-3"
    @update:model-value="yearRange = $event"
  />
</template>

