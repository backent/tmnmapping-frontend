<script setup lang="ts">
import type { SortDirection } from '@/composables/useTableSort'

/**
 * A table header that sorts the list by its column.
 *
 * These pages hand-write their `<thead>` rather than using VDataTable, so there is
 * no built-in sorting to switch on. Rather than repeat the same click handler and
 * caret in six files -- the kind of copy that drifts until one screen behaves
 * differently from the rest -- the behaviour lives here.
 *
 * `column` is the value the API expects in `orderBy`, which the backend whitelists
 * per entity. A column it does not recognise is ignored and the list falls back to
 * its default order, so a typo here degrades rather than breaks.
 */
const props = withDefaults(defineProps<{

  /** The API's name for this column, e.g. `customer_name`. */
  column: string

  /** The column the list is currently sorted by. */
  orderBy: string

  /** The direction it is currently sorted in. */
  orderDirection: SortDirection

  align?: 'start' | 'center' | 'end'
}>(), {
  align: 'start',
})

const emit = defineEmits<{ (e: 'sort', column: string): void }>()

const isActive = computed(() => props.orderBy === props.column)

const icon = computed(() => {
  if (!isActive.value)
    return 'ri-arrow-up-down-line'

  return props.orderDirection === 'ASC' ? 'ri-arrow-up-line' : 'ri-arrow-down-line'
})

/** Screen readers announce the column's state from this rather than the caret. */
const ariaSort = computed(() => {
  if (!isActive.value)
    return 'none'

  return props.orderDirection === 'ASC' ? 'ascending' : 'descending'
})

const alignClass = computed(() => ({
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
}[props.align]))
</script>

<template>
  <th
    class="text-uppercase sortable-th"
    :aria-sort="ariaSort"
  >
    <button
      type="button"
      class="sortable-th__button d-flex align-center gap-1"
      :class="alignClass"
      @click="emit('sort', props.column)"
    >
      <span><slot /></span>
      <VIcon
        :icon="icon"
        size="16"
        :class="isActive ? 'text-primary' : 'sortable-th__icon--idle'"
      />
    </button>
  </th>
</template>

<style scoped>
.sortable-th__button {
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  letter-spacing: inherit;
  text-transform: inherit;
  cursor: pointer;
  padding: 0;
  width: 100%;
}

/* The caret on an inactive column is a hint, not a label: visible enough to show
   the column can be sorted, quiet enough not to compete with the active one. */
.sortable-th__icon--idle {
  opacity: 0.35;
}

.sortable-th__button:hover .sortable-th__icon--idle {
  opacity: 0.7;
}

.sortable-th__button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 2px;
  border-radius: 2px;
}
</style>
