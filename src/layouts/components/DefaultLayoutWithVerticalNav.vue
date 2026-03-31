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
    <template #navbar="{ toggleNav }">
      <div class="d-flex h-100 align-center">
        <!-- 👉 Nav toggle: overlay on mobile, collapse on desktop -->
        <IconBtn
          class="ms-n3"
          @click="toggleNav"
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

    <template #before-vertical-nav-items>
      <div class="nav-user-section mx-3 my-3 pa-3 rounded">
        <div class="d-flex align-center gap-3">
          <VAvatar
            color="primary"
            size="36"
            class="flex-shrink-0"
          >
            <VIcon icon="ri-user-line" size="20" />
          </VAvatar>
          <div class="nav-user-info overflow-hidden">
            <div class="text-sm font-weight-semibold text-truncate">Welcome Back, Jason</div>
            <div class="text-xs text-medium-emphasis text-truncate">Last login: 27 Feb 2026</div>
          </div>
        </div>
      </div>
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

// Mapping page: full-bleed, no scroll, no footer
.layout-mapping-page {
  // Hide footer
  .layout-footer {
    display: none !important;
  }

  // Lock the content wrapper to viewport height so nothing scrolls
  .layout-content-wrapper {
    block-size: 100dvh;
    max-block-size: 100dvh;
    overflow: hidden;
  }

  // Page content fills the remaining space below the 48px topbar
  .layout-page-content {
    padding: 0 !important;
    max-inline-size: 100% !important;
    flex: 1 1 0;
    min-block-size: 0;
    overflow: hidden;

    .page-content-container {
      block-size: 100%;
      overflow: hidden;
    }
  }
}
</style>

<style lang="scss">
.nav-user-section {
  background-color: rgba(var(--v-theme-primary), 0.08);
  border: 1px solid rgba(var(--v-theme-primary), 0.12);

  .nav-user-info {
    transition: opacity 0.25s ease-in-out, max-inline-size 0.25s ease-in-out;
  }
}

// Hide user info text when nav is collapsed (mini mode)
.layout-vertical-nav-collapsed .layout-vertical-nav:not(.hovered) {
  .nav-user-info {
    opacity: 0;
    max-inline-size: 0;
  }
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

