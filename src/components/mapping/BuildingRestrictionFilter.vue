<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useBuildingRestrictionStore } from '@/stores/buildingrestriction'

interface Props {
  modelValue: number[]
}

interface Emits {
  (e: 'update:modelValue', value: number[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const buildingRestrictionStore = useBuildingRestrictionStore()

// Fetch building restrictions if not already loaded
onMounted(async () => {
  if (buildingRestrictionStore.restrictions.length === 0)
    await buildingRestrictionStore.fetchBuildingRestrictions({ take: 1000 }) // Fetch all restrictions
})

// Transform building restrictions to autocomplete items (title/value for VAutocomplete)
const items = computed(() => {
  return buildingRestrictionStore.restrictions.map(restriction => ({
    title: restriction.name,
    value: restriction.id,
  }))
})

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: number[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Building Restriction (Exclude)</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select building restriction(s) to exclude"
      placeholder="Choose restriction(s)..."
      clearable
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      :loading="buildingRestrictionStore.isLoading"
    />
  </div>
</template>
