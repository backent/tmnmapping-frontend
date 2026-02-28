<script lang="ts" setup>
import NavItems from '@/layouts/components/NavItems.vue'
import tmnLogo from '/images/defaultimage.jpeg'
import VerticalNavLayout from '@layouts/components/VerticalNavLayout.vue'

// Components
import Footer from '@/layouts/components/Footer.vue'
import UserProfile from '@/layouts/components/UserProfile.vue'
</script>

<template>
  <VerticalNavLayout>
    <!-- 👉 navbar -->
    <template #navbar="{ toggleVerticalOverlayNavActive, toggleNavCollapsed }">
      <div class="d-flex h-100 align-center">
        <!-- 👉 Vertical nav toggle in overlay mode (mobile) -->
        <IconBtn
          class="ms-n3 d-lg-none"
          @click="toggleVerticalOverlayNavActive(true)"
        >
          <VIcon icon="ri-menu-line" />
        </IconBtn>

        <!-- 👉 Sidebar collapse toggle (desktop) -->
        <IconBtn
          class="ms-n3 d-none d-lg-flex"
          @click="toggleNavCollapsed"
        >
          <VIcon icon="ri-menu-fold-line" />
        </IconBtn>

        <VSpacer />

        <UserProfile />
      </div>
    </template>

    <template #vertical-nav-header="{ toggleIsOverlayNavActive }">
      <RouterLink
        to="/"
        class="app-logo app-title-wrapper"
      >
        <div class="d-flex">
          <img
            :src="tmnLogo"
            alt="TMN Logo"
            class="app-logo-image"
          >
        </div>

        
      </RouterLink>

      <IconBtn
        class="d-block d-lg-none"
        @click="toggleIsOverlayNavActive(false)"
      >
        <VIcon icon="ri-close-line" />
      </IconBtn>
    </template>

    <template #vertical-nav-content>
      <NavItems />
    </template>

    <!-- 👉 Pages -->
    <slot />

    <!-- 👉 Footer -->
    <template #footer>
      <Footer />
    </template>
  </VerticalNavLayout>
</template>

<style lang="scss">
// Reduce topbar height (64px → 48px)
.layout-navbar .navbar-content-container {
  block-size: 48px !important;
}

// Reduce footer height (54px → 36px)
.layout-footer .footer-content-container {
  block-size: 36px !important;
}
</style>

<style lang="scss" scoped>
.app-logo {
  display: flex;
  align-items: center;
  column-gap: 0.75rem;

  .app-logo-title {
    font-size: 1.25rem;
    font-weight: 500;
    line-height: 1.75rem;
    text-transform: uppercase;
  }

  .app-logo-image {
    max-height: 2rem;
    width: auto;
  }
}
</style>

