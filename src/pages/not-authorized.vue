<script setup lang="ts">
import { useTheme } from 'vuetify'
import miscError from '@images/pages/404.png'
import miscMaskDark from '@images/pages/misc-mask-dark.png'
import miscMaskLight from '@images/pages/misc-mask-light.png'
import tree from '@images/pages/tree.png'

const vuetifyTheme = useTheme()

const authThemeMask = computed(() => {
  return vuetifyTheme.global.name.value === 'light'
    ? miscMaskLight
    : miscMaskDark
})
</script>

<template>
  <div class="misc-wrapper">
    <ErrorHeader
      status-code="403"
      title="You are not authorized 🔐"
      description="Your role does not have access to this page. Ask an administrator if you need it."
    />

    <!-- 👉 Image -->
    <div class="misc-avatar w-100 text-center">
      <VImg
        :src="miscError"
        alt="Not authorized"
        :max-width="800"
        class="mx-auto"
      />
      <VBtn
        to="/dashboard"
        class="mt-10"
      >
        Back to Dashboard
      </VBtn>
    </div>

    <!-- 👉 Footer -->
    <VImg
      :src="tree"
      class="misc-footer-tree d-none d-md-block"
    />

    <VImg
      :src="authThemeMask"
      class="misc-footer-img d-none d-md-block"
    />
  </div>
</template>

<style lang="scss">
@use "@core/scss/template/pages/misc.scss";

.misc-footer-tree {
  inline-size: 15.625rem;
  inset-block-end: 3.5rem;
  inset-inline-start: 0.375rem;
}
</style>
