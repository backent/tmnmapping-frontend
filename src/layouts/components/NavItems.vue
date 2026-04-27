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
  <VerticalNavLink
    :item="{
      title: 'Mapping',
      icon: 'ri-map-pin-line',
      to: '/mapping',
    }"
  />

  <!-- POI Section -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Points of Interest',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'POI List',
      icon: 'ri-map-pin-3-line',
      to: '/pois',
    }"
  />

  <!-- Sales packages -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Sales',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Sales Packages',
      icon: 'ri-price-tag-3-line',
      to: '/sales-packages',
    }"
  />

  <!-- Restrictions -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Restrictions',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Building Restrictions',
      icon: 'ri-shield-line',
      to: '/building-restrictions',
    }"
  />

  <!-- Master Data -->
  <VerticalNavSectionTitle
    :item="{
      heading: 'Master Data',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Categories',
      icon: 'ri-folder-line',
      to: '/categories',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Sub Categories',
      icon: 'ri-folder-2-line',
      to: '/sub-categories',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Mother Brands',
      icon: 'ri-briefcase-line',
      to: '/mother-brands',
    }"
  />
  <VerticalNavLink
    :item="{
      title: 'Branches',
      icon: 'ri-store-line',
      to: '/branches',
    }"
  />
</template>
