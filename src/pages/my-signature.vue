<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'
import SignatureUploader from '@/components/signature/SignatureUploader.vue'
import { deleteMySignature, mySignatureUrl, uploadMySignature } from '@/http/signature'
import { ROLE_LABELS } from '@/config/roles'
import type { Role } from '@/config/roles'

/**
 * My Signature (2026-11-12). An approver's signature is printed under "Approved by:"
 * on every quotation they approve, so they cannot approve without one.
 */

const authStore = useAuthStore()

// Bumped after every change so the browser does not show the previous image.
const version = ref(Date.now())

const user = computed(() => authStore.currentUser)
const hasSignature = computed(() => !!user.value?.has_signature)
const imageUrl = computed(() => (hasSignature.value ? mySignatureUrl(version.value) : null))
const roleLabel = computed(() => ROLE_LABELS[user.value?.role as Role] ?? user.value?.role ?? '')

const refresh = async () => {
  await authStore.fetchCurrentUser()
  version.value = Date.now()
}

const upload = async (file: File) => {
  await uploadMySignature(file)
  await refresh()
}

const remove = async () => {
  await deleteMySignature()
  await refresh()
}
</script>

<template>
  <VRow>
    <VCol
      cols="12"
      md="8"
      lg="6"
    >
      <VCard>
        <VCardTitle>My Signature</VCardTitle>
        <VCardText>
          <p class="text-body-2 mb-4">
            Printed under "Approved by:" on every quotation you approve, with your name and
            job title. You cannot approve a quotation until it is set.
          </p>

          <VAlert
            v-if="!hasSignature"
            type="warning"
            variant="tonal"
            density="compact"
            class="mb-4"
          >
            You have no signature yet, so you cannot approve quotations.
          </VAlert>

          <div class="mb-4">
            <div class="text-caption text-medium-emphasis">
              Printed as
            </div>
            <div class="font-weight-medium">
              {{ user?.name }}
            </div>
            <div class="text-body-2">
              {{ user?.job_title || roleLabel }}
            </div>
            <div
              v-if="!user?.job_title"
              class="text-caption text-medium-emphasis"
            >
              No job title is set, so your role is printed. An admin sets the job title.
            </div>
          </div>

          <SignatureUploader
            :image-url="imageUrl"
            :upload="upload"
            :remove="remove"
          />
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
