<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useTheme } from 'vuetify'
import { useAuthStore } from '@/stores/auth'
import miscError from '@images/pages/404.png'
import miscMaskDark from '@images/pages/misc-mask-dark.png'
import miscMaskLight from '@images/pages/misc-mask-light.png'
import tree from '@images/pages/tree.png'

const vuetifyTheme = useTheme()
const authStore = useAuthStore()
const router = useRouter()

// An account with no access at all (a freelancer) has no dashboard to go back to.
const hasNoAccess = computed(() => !authStore.hasAnyPermission)

const logout = async () => {
  await authStore.logout()
  router.push('/login')
}

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
      :description="hasNoAccess
        ? 'Your account has no access to the app. A sales admin enters and follows up your quotations.'
        : 'Your role does not have access to this page. Ask an administrator if you need it.'"
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
        v-if="hasNoAccess"
        class="mt-10"
        @click="logout"
      >
        Log out
      </VBtn>
      <VBtn
        v-else
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
