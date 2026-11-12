<script setup lang="ts">
import { SIGNATURE_ACCEPT, signatureFileProblem } from '@/http/signature'
import { extractApiError } from '@/utils/apiError'

/**
 * Upload, preview and remove an approval signature (2026-11-12). Used by "My
 * Signature" (an approver's own) and by the user form (an admin, for anyone).
 *
 * The server makes white paper transparent and trims to the ink, so a phone photo
 * of a signature on white paper works; the preview shows the result as printed.
 */

const props = defineProps<{

  /** The current signature image, or null when the user has none. */
  imageUrl: string | null

  upload: (file: File) => Promise<void>
  remove: () => Promise<void>
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const busy = ref(false)
const error = ref('')
const confirmRemove = ref(false)

const pick = () => {
  error.value = ''
  fileInput.value?.click()
}

const onFile = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  input.value = ''
  if (!file)
    return

  const problem = signatureFileProblem(file)
  if (problem) {
    error.value = problem

    return
  }

  busy.value = true
  error.value = ''
  try {
    await props.upload(file)
  }
  catch (e) {
    error.value = extractApiError(e, 'Failed to upload the signature')
  }
  finally {
    busy.value = false
  }
}

const doRemove = async () => {
  busy.value = true
  error.value = ''
  try {
    await props.remove()
    confirmRemove.value = false
  }
  catch (e) {
    error.value = extractApiError(e, 'Failed to remove the signature')
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div>
    <!-- Shown as the document prints it: the signature above the line. -->
    <div class="signature-preview">
      <img
        v-if="imageUrl"
        :src="imageUrl"
        alt="Signature"
        class="signature-preview__image"
      >
      <span
        v-else
        class="text-medium-emphasis text-body-2"
      >
        No signature yet
      </span>
      <div class="signature-preview__line" />
    </div>

    <VAlert
      v-if="error"
      type="error"
      variant="tonal"
      density="compact"
      class="mt-3"
    >
      {{ error }}
    </VAlert>

    <div class="d-flex flex-wrap gap-2 mt-3">
      <VBtn
        color="primary"
        :loading="busy"
        @click="pick"
      >
        <VIcon
          icon="ri-upload-2-line"
          class="me-1"
        />
        {{ imageUrl ? 'Replace signature' : 'Upload signature' }}
      </VBtn>
      <VBtn
        v-if="imageUrl"
        color="error"
        variant="outlined"
        :disabled="busy"
        @click="confirmRemove = true"
      >
        Remove
      </VBtn>
    </div>

    <p class="text-caption text-medium-emphasis mt-2 mb-0">
      PNG or JPEG, up to 2 MB. Sign on plain white paper; the white background is made
      transparent and the image is trimmed to the signature. Quotations already approved
      keep the signature they were approved with.
    </p>

    <input
      ref="fileInput"
      type="file"
      :accept="SIGNATURE_ACCEPT"
      style="display: none"
      @change="onFile"
    >

    <VDialog
      v-model="confirmRemove"
      max-width="420"
    >
      <VCard>
        <VCardTitle>Remove signature?</VCardTitle>
        <VCardText>
          Quotations cannot be approved without a signature. Quotations already approved
          keep theirs.
        </VCardText>
        <VCardActions class="justify-end">
          <VBtn
            variant="outlined"
            @click="confirmRemove = false"
          >
            Cancel
          </VBtn>
          <VBtn
            color="error"
            variant="elevated"
            :loading="busy"
            @click="doRemove"
          >
            Remove
          </VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>

<style scoped>
.signature-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  max-inline-size: 360px;
  min-block-size: 120px;
  padding: 12px 24px 8px;
  border: 1px dashed rgba(var(--v-border-color), var(--v-border-opacity));
  border-radius: 6px;
  background: #fff;
}

.signature-preview__image {
  max-block-size: 90px;
  max-inline-size: 100%;
  object-fit: contain;
}

.signature-preview__line {
  align-self: stretch;
  margin-block-start: 4px;
  border-block-end: 1px solid #000;
}
</style>
