<script setup lang="ts">
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

// Individual year values
const startYear = ref<number>(props.modelValue[0])
const endYear = ref<number>(props.modelValue[1])

// Watch for prop changes
watch(() => props.modelValue, newValue => {
  startYear.value = newValue[0]
  endYear.value = newValue[1]
}, { immediate: true })

// Simple update function - no validation, no clamping, just emit the values
const updateYearRange = () => {
  emit('update:modelValue', [startYear.value, endYear.value])
}
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
      outlined
      dense
      @update:model-value="updateYearRange"
    />
    <VTextField
      v-model.number="endYear"
      label="End Year"
      type="number"
      outlined
      dense
      @update:model-value="updateYearRange"
    />
  </div>
</template>
