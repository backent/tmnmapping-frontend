<script setup lang="ts">
import { onMounted } from 'vue'
import { usePOIStore } from '@/stores/poi'

interface Props {
  modelValue: number[] | undefined
}

interface Emits {
  (e: 'update:modelValue', value: number[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const poiStore = usePOIStore()

// Fetch all POIs for dropdown (without pagination)
onMounted(async () => {
  if (poiStore.pois.length === 0) {
    try {
      // Fetch all POIs without pagination limit
      await poiStore.fetchPOIs({ take: 1000, skip: 0 })
    }
    catch (error) {
      console.error('Error fetching POIs:', error)
    }
  }
})

// Transform POIs to autocomplete items
const items = computed(() => {
  return poiStore.pois.map(poi => ({
    title: poi.brand,
    value: poi.id,
    color: poi.color,
  }))
})

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: number[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Point of Interest</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      label="Select POI(s)"
      placeholder="Choose a POI..."
      multiple
      clearable
      chips
      variant="outlined"
      density="compact"
      :loading="poiStore.isLoading"
    >
      <template #item="{ props: itemProps, item }">
        <VListItem
          v-bind="itemProps"
          :title="item.raw.title"
        >
          <template #prepend>
            <VAvatar
              :color="item.raw.color"
              size="24"
              class="me-2"
            />
          </template>
        </VListItem>
      </template>
      <template #chip="{ item, props: chipProps }">
        <VChip
          v-bind="chipProps"
          :prepend-avatar="undefined"
        >
          <template #prepend>
            <VAvatar
              :color="item.raw.color"
              size="16"
              class="me-1"
            />
          </template>
          {{ item.raw.title }}
        </VChip>
      </template>
    </VAutocomplete>
  </div>
</template>
