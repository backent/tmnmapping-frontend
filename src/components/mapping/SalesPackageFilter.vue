<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useSalesPackageStore } from '@/stores/salespackage'

interface Props {
  modelValue: number[]
}

interface Emits {
  (e: 'update:modelValue', value: number[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const salesPackageStore = useSalesPackageStore()

// Fetch sales packages if not already loaded
onMounted(async () => {
  if (salesPackageStore.packages.length === 0) {
    await salesPackageStore.fetchSalesPackages({ take: 1000 }) // Fetch all packages
  }
})

// Transform sales packages to autocomplete items (title/value for VAutocomplete)
const items = computed(() => {
  return salesPackageStore.packages.map(pkg => ({
    title: pkg.name,
    value: pkg.id,
  }))
})

const selected = computed({
  get: () => props.modelValue ?? [],
  set: (value: number[]) => emit('update:modelValue', value ?? []),
})
</script>

<template>
  <VDivider />
  <VSubheader>Sales Package</VSubheader>
  <div class="pa-3">
    <VAutocomplete
      v-model="selected"
      :items="items"
      item-title="title"
      item-value="value"
      label="Select sales package(s)"
      placeholder="Choose package(s)..."
      clearable
      multiple
      chips
      closable-chips
      variant="outlined"
      density="compact"
      :loading="salesPackageStore.isLoading"
    />
  </div>
</template>
