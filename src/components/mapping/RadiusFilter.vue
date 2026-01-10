<script setup lang="ts">
interface Props {
  modelValue: number
  max?: number
}

interface Emits {
  (e: 'update:modelValue', value: number): void
}

const props = withDefaults(defineProps<Props>(), {
  max: 200,
})

const emit = defineEmits<Emits>()

const radiusValue = ref<number>(props.modelValue)

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  radiusValue.value = newValue
}, { immediate: true })

// Validation and update function
const updateRadius = () => {
  let validRadius = radiusValue.value

  // Clamp value to valid range
  if (validRadius < 0)
    validRadius = 0
  if (props.max && validRadius > props.max)
    validRadius = props.max

  // Update ref if clamped
  if (radiusValue.value !== validRadius)
    radiusValue.value = validRadius

  // Emit the updated radius
  emit('update:modelValue', validRadius)
}

// Computed for error messages
const radiusError = computed(() => {
  if (radiusValue.value < 0)
    return 'Radius must be greater than or equal to 0'
  if (props.max && radiusValue.value > props.max)
    return `Radius must be less than or equal to ${props.max}`
  return ''
})
</script>

<template>
  <VDivider />
  <VSubheader>Radius (kilometers)</VSubheader>
  <div class="pa-3">
    <VTextField
      v-model.number="radiusValue"
      label="Radius"
      type="number"
      :min="0"
      :max="max"
      suffix="km"
      outlined
      dense
      :error-messages="radiusError"
      @update:model-value="updateRadius"
    />
  </div>
</template>

