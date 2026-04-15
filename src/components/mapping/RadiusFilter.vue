<script setup lang="ts">
interface Props {
  modelValue: number
}

interface Emits {
  (e: 'update:modelValue', value: number): void
}

const props = defineProps<Props>()

const emit = defineEmits<Emits>()

const radiusValue = ref<number>(props.modelValue)

// Watch for prop changes (e.g. reset from parent)
watch(() => props.modelValue, newValue => {
  radiusValue.value = newValue
}, { immediate: true })

// Emit when local value changes so radius 0 syncs immediately (e.g. center marker hides)
watch(radiusValue, val => {
  const num = Number(val)

  emit('update:modelValue', Number.isFinite(num) && num >= 0 ? num : 0)
}, { flush: 'sync' })

// Simple update function - no validation, no clamping, just emit the value
const updateRadius = () => {
  const num = Number(radiusValue.value)

  emit('update:modelValue', Number.isFinite(num) && num >= 0 ? num : 0)
}
</script>

<template>
  <VDivider />
  <VSubheader>Radius (kilometers)</VSubheader>
  <div class="pa-3">
    <VTextField
      v-model.number="radiusValue"
      label="Radius"
      type="number"
      suffix="km"
      outlined
      dense
      @update:model-value="updateRadius"
      @blur="updateRadius"
    />
  </div>
</template>
