<script setup lang="ts">
import type { POIPoint } from '@/types/poi'

interface Props {
  points: POIPoint[]
}

interface Emits {
  (e: 'remove', index: number): void
  (e: 'edit', index: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleRemove = (index: number) => {
  emit('remove', index)
}

const handleEdit = (index: number) => {
  emit('edit', index)
}
</script>

<template>
  <div>
    <div
      v-if="points.length === 0"
      class="text-center text-disabled py-4"
    >
      No points added yet. Add a point using the search above.
    </div>

    <VList v-else>
      <VListItem
        v-for="(point, index) in points"
        :key="index"
      >
        <VListItemTitle>
          <strong>{{ point.poi_name || 'Unnamed Place' }}</strong>
        </VListItemTitle>
        <VListItemSubtitle>
          {{ point.address }}
        </VListItemSubtitle>
        <VListItemSubtitle>
          Lat: {{ point.latitude.toFixed(6) }}, Lng: {{ point.longitude.toFixed(6) }}
        </VListItemSubtitle>
        <VListItemSubtitle v-if="point.branch">
          <span>Branch: {{ point.branch }}</span>
        </VListItemSubtitle>

        <template #append>
          <VBtn
            icon
            size="small"
            color="primary"
            variant="text"
            @click="handleEdit(index)"
          >
            <VIcon icon="ri-edit-line" />
            <VTooltip
              activator="parent"
              location="top"
            >
              Edit
            </VTooltip>
          </VBtn>
          <VBtn
            icon
            size="small"
            color="error"
            variant="text"
            @click="handleRemove(index)"
          >
            <VIcon icon="ri-delete-bin-line" />
            <VTooltip
              activator="parent"
              location="top"
            >
              Delete
            </VTooltip>
          </VBtn>
        </template>
      </VListItem>
    </VList>

    <VChip
      v-if="points.length > 0"
      class="mt-2"
      color="primary"
    >
      {{ points.length }} {{ points.length === 1 ? 'point' : 'points' }} added
    </VChip>
  </div>
</template>
