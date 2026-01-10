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

const radius = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
</script>

<template>
  <VDivider />
  <VSubheader>Radius {{ radius }} kilometer</VSubheader>
  <VSlider
    v-model="radius"
    step="1"
    min="0"
    :max="max"
    class="pr-3 pl-3"
    @update:model-value="radius = $event"
  />
</template>

