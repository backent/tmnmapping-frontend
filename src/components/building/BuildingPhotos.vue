<script setup lang="ts">
import { deleteBuildingImage, getHostedBuildingImages, uploadBuildingImage } from '@/http/building'
import type { HostedBuildingImage } from '@/types/building'
import {
  BUILDING_IMAGE_SLOTS,
  buildingImageSlotLabel,
  buildingImageUrl,
} from '@/utils/images'
import type { BuildingImageSlot } from '@/utils/images'

/**
 * The four building photos, each either ours or ERP's.
 *
 * One URL per slot answers for both: the server returns the photo this application
 * hosts when there is one and ERP's when there is not. So this component never asks
 * "which source?" to decide what to show -- only to decide what to say about it, and
 * whether Remove is offered.
 */
const props = defineProps<{ buildingId: number; canManage: boolean }>()

const hosted = ref<HostedBuildingImage[]>([])
const isLoading = ref(false)
const busySlot = ref<string | null>(null)
const errorMessage = ref('')

// Bumped after every change, and appended to each URL. The URL is stable when a photo
// is replaced -- only the file behind it moves -- so without this a browser would keep
// showing the old picture from cache.
const version = ref(Date.now())

const hostedBySlot = computed(() => {
  const bySlot: Record<string, HostedBuildingImage> = {}

  hosted.value.forEach(image => {
    bySlot[image.slot] = image
  })

  return bySlot
})

const load = async () => {
  if (!props.buildingId)
    return

  isLoading.value = true
  try {
    hosted.value = (await getHostedBuildingImages(props.buildingId)).data || []
  }
  catch {
    // The photos are supporting detail; failing to list ours must not break the page.
    hosted.value = []
  }
  finally {
    isLoading.value = false
  }
}

const fileInputs = ref<Record<string, HTMLInputElement | null>>({})

const pick = (slot: string) => fileInputs.value[slot]?.click()

const upload = async (slot: string, event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  // Reset first, so choosing the same file twice still fires a change event.
  input.value = ''
  if (!file)
    return

  busySlot.value = slot
  errorMessage.value = ''
  try {
    await uploadBuildingImage(props.buildingId, slot, file)
    await load()
    version.value = Date.now()
  }
  catch (error: any) {
    errorMessage.value = error?.details?.data || 'Could not upload that image'
  }
  finally {
    busySlot.value = null
  }
}

const remove = async (slot: string) => {
  busySlot.value = slot
  errorMessage.value = ''
  try {
    await deleteBuildingImage(props.buildingId, slot)
    await load()
    version.value = Date.now()
  }
  catch (error: any) {
    errorMessage.value = error?.details?.data || 'Could not remove that image'
  }
  finally {
    busySlot.value = null
  }
}

watch(() => props.buildingId, load)
onMounted(load)

defineExpose({ reload: load })
</script>

<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-1">
      <div class="text-subtitle-1">
        Photos
      </div>
      <VProgressCircular
        v-if="isLoading"
        indeterminate
        size="18"
      />
    </div>
    <div class="text-caption text-disabled mb-3">
      Uploading replaces the photo ERP supplies. Removing yours brings ERP's back —
      it does not delete the picture.
    </div>

    <VAlert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      density="compact"
      class="mb-3"
      closable
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </VAlert>

    <VRow>
      <VCol
        v-for="slot in BUILDING_IMAGE_SLOTS"
        :key="slot"
        cols="6"
        md="3"
      >
        <VCard variant="outlined">
          <!--
            One URL for both sources. A slot with neither ours nor ERP's answers
            404, and the error slot renders the placeholder.
          -->
          <VImg
            :src="buildingImageUrl(buildingId, slot as BuildingImageSlot, version)"
            height="150"
            cover
          >
            <template #error>
              <div class="d-flex flex-column align-center justify-center h-100 text-disabled">
                <VIcon
                  icon="ri-image-line"
                  size="28"
                />
                <span class="text-caption mt-1">No photo</span>
              </div>
            </template>
            <template #placeholder>
              <div class="d-flex align-center justify-center h-100">
                <VProgressCircular
                  indeterminate
                  size="22"
                />
              </div>
            </template>
          </VImg>

          <VCardText class="py-2">
            <div class="d-flex align-center justify-space-between">
              <span class="text-caption font-weight-medium">
                {{ buildingImageSlotLabel(slot) }}
              </span>
              <VChip
                size="x-small"
                :color="hostedBySlot[slot] ? 'primary' : undefined"
                variant="outlined"
              >
                {{ hostedBySlot[slot] ? 'Ours' : 'From ERP' }}
              </VChip>
            </div>
            <div
              v-if="hostedBySlot[slot]?.uploaded_by_name"
              class="text-caption text-disabled mt-1"
            >
              by {{ hostedBySlot[slot].uploaded_by_name }}
            </div>
          </VCardText>

          <VCardActions v-if="canManage">
            <input
              :ref="element => { fileInputs[slot] = element as HTMLInputElement }"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="d-none"
              @change="event => upload(slot, event)"
            >
            <VBtn
              size="small"
              variant="text"
              :loading="busySlot === slot"
              @click="pick(slot)"
            >
              {{ hostedBySlot[slot] ? 'Replace' : 'Upload' }}
            </VBtn>
            <VBtn
              v-if="hostedBySlot[slot]"
              size="small"
              variant="text"
              color="error"
              :disabled="busySlot === slot"
              @click="remove(slot)"
            >
              Remove
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>
    </VRow>
  </div>
</template>
