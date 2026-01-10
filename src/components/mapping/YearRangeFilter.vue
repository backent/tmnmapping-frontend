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

// Use default range if not set from API
const minYear = computed(() => mappingStore.yearRange?.[0] || 1980)
const maxYear = computed(() => mappingStore.yearRange?.[1] || new Date().getFullYear())

// Individual year values
const startYear = ref<number>(props.modelValue[0])
const endYear = ref<number>(props.modelValue[1])

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  startYear.value = newValue[0]
  endYear.value = newValue[1]
}, { immediate: true })

// Validation and update function
const updateYearRange = () => {
  let validStart = startYear.value
  let validEnd = endYear.value

  // Clamp values to min/max range
  if (validStart < minYear.value)
    validStart = minYear.value
  if (validStart > maxYear.value)
    validStart = maxYear.value
  if (validEnd < minYear.value)
    validEnd = minYear.value
  if (validEnd > maxYear.value)
    validEnd = maxYear.value

  // Ensure start <= end
  if (validStart > validEnd)
    validStart = validEnd

  // Update refs if clamped
  if (startYear.value !== validStart)
    startYear.value = validStart
  if (endYear.value !== validEnd)
    endYear.value = validEnd

  // Emit the updated range
  emit('update:modelValue', [validStart, validEnd])
}

// Computed for error messages
const startYearError = computed(() => {
  if (startYear.value > endYear.value)
    return 'Start year must be less than or equal to end year'
  if (startYear.value < minYear.value || startYear.value > maxYear.value)
    return `Year must be between ${minYear.value} and ${maxYear.value}`
  return ''
})

const endYearError = computed(() => {
  if (endYear.value < startYear.value)
    return 'End year must be greater than or equal to start year'
  if (endYear.value < minYear.value || endYear.value > maxYear.value)
    return `Year must be between ${minYear.value} and ${maxYear.value}`
  return ''
})
</script>

<template>
  <VDivider />
  <VSubheader v-if="!reporting">
    Year Range
  </VSubheader>
  <div
    v-if="!reporting"
    class="d-flex gap-2 pa-3"
  >
    <VTextField
      v-model.number="startYear"
      label="Start Year"
      type="number"
      :min="minYear"
      :max="maxYear"
      outlined
      dense
      :error-messages="startYearError"
      @update:model-value="updateYearRange"
    />
    <VTextField
      v-model.number="endYear"
      label="End Year"
      type="number"
      :min="minYear"
      :max="maxYear"
      outlined
      dense
      :error-messages="endYearError"
      @update:model-value="updateYearRange"
    />
  </div>
</template>

