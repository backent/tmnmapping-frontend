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

// Watch for prop changes
watch(() => props.modelValue, (newValue) => {
  radiusValue.value = newValue
}, { immediate: true })

// Simple update function - no validation, no clamping, just emit the value
const updateRadius = () => {
  emit('update:modelValue', radiusValue.value)
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
    />
  </div>
</template>

