<script lang="ts" setup>
import NavItems from '@/layouts/components/NavItems.vue'
import tmnLogo from '/images/defaultimage.jpeg'
import VerticalNavLayout from '@layouts/components/VerticalNavLayout.vue'

// Components
import Footer from '@/layouts/components/Footer.vue'
import NavUserProfile from '@/layouts/components/NavUserProfile.vue'
</script>

<template>
  <VerticalNavLayout>
    <!-- navbar is hidden; slot kept empty -->
    <template #navbar="{ toggleNav: _ }" />

    <template #vertical-nav-header="{ toggleIsOverlayNavActive, toggleNav }">
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

      <!-- Nav toggle lives in the sidebar now -->
      <IconBtn @click="toggleNav">
        <VIcon icon="ri-menu-fold-line" />
      </IconBtn>
    </template>

    <template #before-vertical-nav-items>
      <NavUserProfile />
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
// Hide navbar globally — toggle is now in the sidebar
.layout-navbar {
  display: none !important;
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

  .nav-welcome-text {
    font-size: 0.95rem;
    line-height: 1.3;
  }

  .nav-user-collapsed {
    display: none !important;
  }
}

// Collapsed (mini) mode — show only the avatar icon
.layout-vertical-nav-collapsed .layout-vertical-nav:not(.hovered) {
  .nav-user-section {
    margin-inline: 0.5rem;
    padding: 0.5rem;

    .nav-user-info {
      display: none !important;
    }

    .nav-user-collapsed {
      display: flex !important;
    }
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

