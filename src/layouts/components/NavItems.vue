<script lang="ts" setup>
import VerticalNavSectionTitle from '@/@layouts/components/VerticalNavSectionTitle.vue'
import VerticalNavLink from '@layouts/components/VerticalNavLink.vue'
</script>

<template>
  <!-- Dashboard -->
  <VerticalNavLink
    :item="{
      title: 'Dashboard',
      icon: 'ri-dashboard-line',
      to: '/dashboard',
    }"
  />

  <!-- Buildings Section -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Buildings',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Buildings List',
      icon: 'ri-building-line',
      to: '/buildings',
    }"
  />
</template>
