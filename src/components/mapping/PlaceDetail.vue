<script setup lang="ts">
import type { PotentialClient } from '@/types/mapping'

interface Props {
  place: PotentialClient | null
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
</script>

<template>
  <VCard
    v-if="place"
    class="mx-auto mb-5"
    max-width="400"
    tile
  >
    <VCardTitle>
      {{ place.name }}
    </VCardTitle>

    <VDivider />

    <VCardText>
      <p>
        Places: {{ place.places?.length || 0 }}
      </p>
    </VCardText>

    <VCardActions>
      <VSpacer />
      <VBtn
        color="error"
        @click="emit('close')"
      >
        Close
      </VBtn>
    </VCardActions>
  </VCard>
</template>
