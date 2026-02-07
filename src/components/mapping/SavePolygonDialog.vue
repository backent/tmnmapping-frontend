<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useSavedPolygonStore } from '@/stores/savedpolygon'

interface Props {
  modelValue: boolean
  polygon: { lat: number; lng: number }[] | undefined
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
}>()

const savedPolygonStore = useSavedPolygonStore()
const name = ref('')
const isSaving = ref(false)
const errorMessage = ref('')

const canSave = computed(() => {
  return name.value.trim().length > 0 &&
    props.polygon != null &&
    props.polygon.length >= 3 &&
    !isSaving.value
})

watch(() => props.modelValue, (visible) => {
  if (visible) {
    name.value = ''
    errorMessage.value = ''
  }
})

async function save() {
  if (!canSave.value || !props.polygon) return
  errorMessage.value = ''
  isSaving.value = true
  try {
    await savedPolygonStore.createSavedPolygon({
      name: name.value.trim(),
      points: props.polygon,
    })
    emit('saved')
    emit('update:modelValue', false)
  }
  catch (err: any) {
    errorMessage.value = err?.details?.message || err?.details || 'Failed to save polygon'
  }
  finally {
    isSaving.value = false
  }
}

function cancel() {
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="400"
    persistent
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard>
      <VCardTitle>Save polygon</VCardTitle>
      <VDivider />
      <VCardText>
        <VAlert
          v-if="errorMessage"
          type="error"
          density="compact"
          class="mb-3"
        >
          {{ errorMessage }}
        </VAlert>
        <VTextField
          v-model="name"
          label="Polygon name"
          placeholder="e.g. Downtown area"
          variant="outlined"
          density="compact"
          :disabled="isSaving"
          autofocus
        />
      </VCardText>
      <VCardActions>
        <VSpacer />
        <VBtn
          variant="text"
          :disabled="isSaving"
          @click="cancel"
        >
          Cancel
        </VBtn>
        <VBtn
          color="primary"
          :loading="isSaving"
          :disabled="!canSave"
          @click="save"
        >
          Save
        </VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>
