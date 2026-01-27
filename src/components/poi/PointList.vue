<script setup lang="ts">
import type { POIPoint } from '@/types/poi'

interface Props {
  points: POIPoint[]
}

interface Emits {
  (e: 'remove', index: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const handleRemove = (index: number) => {
  emit('remove', index)
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
          <strong>{{ point.place_name || 'Unnamed Place' }}</strong>
        </VListItemTitle>
        <VListItemSubtitle>
          {{ point.address }}
        </VListItemSubtitle>
        <VListItemSubtitle>
          Lat: {{ point.latitude.toFixed(6) }}, Lng: {{ point.longitude.toFixed(6) }}
        </VListItemSubtitle>

        <template #append>
          <VBtn
            icon
            size="small"
            color="error"
            variant="text"
            @click="handleRemove(index)"
          >
            <VIcon>mdi-delete</VIcon>
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
