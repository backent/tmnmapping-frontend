<script setup lang="ts">
defineProps<{
  statusCode?: string | number
  title?: string
  description?: string
}>()
</script>

<template>
  <!--
    Heading for the error pages (404 and not-authorized). Both pages referenced this
    component, but it did not exist, so they rendered without a title (found
    2026-11-15).
  -->
  <div class="text-center mb-4">
    <h1
      v-if="statusCode"
      class="text-h1 font-weight-medium"
    >
      {{ statusCode }}
    </h1>
    <h4
      v-if="title"
      class="text-h4 mb-2"
    >
      {{ title }}
    </h4>
    <p
      v-if="description"
      class="text-body-1 mb-0"
    >
      {{ description }}
    </p>
  </div>
</template>
