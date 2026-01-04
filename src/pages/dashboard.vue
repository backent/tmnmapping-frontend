<script setup lang="ts">
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <VRow>
    <VCol cols="12">
      <VCard>
        <VCardTitle>
          <h2>Welcome to TMN Mapping</h2>
        </VCardTitle>
        <VCardText>
          <p class="text-h6 mb-4">
            Hello, {{ authStore.userName }}!
          </p>
          <p class="mb-2">
            Use the navigation menu to manage buildings.
          </p>
          <VBtn
            color="primary"
            to="/buildings"
          >
            View Buildings
          </VBtn>
        </VCardText>
      </VCard>
    </VCol>
  </VRow>
</template>
