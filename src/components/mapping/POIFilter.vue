<script setup lang="ts">
import { computed, ref } from 'vue'
import POIPickerDialog from './POIPickerDialog.vue'
import { useMappingStore } from '@/stores/mapping'
import type { POI } from '@/types/poi'

interface Props {
  modelValue: number[] | undefined
}

interface Emits {
  (e: 'update:modelValue', ids: number[], pois: POI[]): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const mappingStore = useMappingStore()

const dialogOpen = ref(false)

const selectedIds = computed(() => props.modelValue ?? [])

// Hydrated POI objects for the currently-applied selection. Source of truth is
// `mappingStore.selectedPOIs` (already maintained as `POI[]` by the store).
const selectedPOIs = computed<POI[]>(() => mappingStore.selectedPOIs ?? [])

function openPicker() {
  dialogOpen.value = true
}

function handleApply(payload: { ids: number[]; pois: POI[] }) {
  emit('update:modelValue', payload.ids, payload.pois)
}
</script>

<template>
  <VDivider />
  <VSubheader>Point of Interest</VSubheader>
  <div class="pa-3">
    <!-- Display-only field; clicking opens the picker dialog. -->
    <div
      class="poi-display"
      role="button"
      tabindex="0"
      @click="openPicker"
      @keydown.enter="openPicker"
      @keydown.space.prevent="openPicker"
    >
      <div
        v-if="selectedIds.length === 0"
        class="text-medium-emphasis text-body-2"
      >
        Select POI(s)…
      </div>
      <div
        v-else
        class="d-flex flex-wrap gap-1"
      >
        <VChip
          v-for="poi in selectedPOIs"
          :key="poi.id"
          size="small"
          variant="tonal"
        >
          <template #prepend>
            <VAvatar
              :color="poi.color"
              size="16"
              class="me-1"
            />
          </template>
          {{ poi.brand }}
        </VChip>
      </div>
      <VIcon
        icon="ri-arrow-drop-down-line"
        class="poi-display-icon"
      />
    </div>

    <POIPickerDialog
      v-model="dialogOpen"
      :selected-ids="selectedIds"
      :selected-pois="selectedPOIs"
      @apply="handleApply"
    />
  </div>
</template>

<style scoped>
.poi-display {
  position: relative;
  min-height: 40px;
  border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 4px;
  padding: 6px 32px 6px 10px;
  cursor: pointer;
  transition: border-color 0.15s ease;
  display: flex;
  align-items: center;
}

.poi-display:hover {
  border-color: rgb(var(--v-theme-primary));
}

.poi-display:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

.poi-display-icon {
  position: absolute;
  inset-inline-end: 6px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  opacity: 0.6;
}
</style>
