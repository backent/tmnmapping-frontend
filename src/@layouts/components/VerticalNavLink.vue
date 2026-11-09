<script lang="ts" setup>
import { computed } from 'vue'
import type { NavLink } from '@layouts/types'

const props = defineProps<{
  item: NavLink
}>()

/**
 * A route item gets only `to`. Passing it `href` as well, even undefined, overrode
 * the href RouterLink renders, so every menu item was an <a> without one: a click
 * still navigated, but Cmd/Ctrl-click, middle-click and "Open in new tab" had
 * nothing to open. Only an external item takes `href`.
 */
const linkProps = computed(() => (props.item.to
  ? { to: props.item.to, target: props.item.target }
  : { href: props.item.href, target: props.item.target, rel: props.item.rel }))
</script>

<template>
  <li
    class="nav-link"
    :class="{ disabled: item.disable }"
  >
    <Component
      :is="item.to ? 'RouterLink' : 'a'"
      v-bind="linkProps"
    >
      <VIcon
        :icon="(item.icon as string) || 'ri-checkbox-blank-circle-line'"
        class="nav-item-icon"
      />
      <!-- 👉 Title -->
      <span class="nav-item-title">
        {{ item.title }}
      </span>
      <span
        class="nav-item-badge"
        :class="item.badgeClass"
      >
        {{ item.badgeContent }}
      </span>
    </Component>
  </li>
</template>

<style lang="scss">
.layout-vertical-nav {
  .nav-link a {
    display: flex;
    align-items: center;
    cursor: pointer;
  }
}
</style>
