import { ref } from 'vue'

export type SortDirection = 'ASC' | 'DESC'

/**
 * Sort state for a server-paginated list.
 *
 * Sorting happens in the API, not the browser: these tables show one page at a
 * time, so reordering the rows already on screen would sort a slice and look like
 * a bug. Every list page already sends `orderBy` and `orderDirection` -- they were
 * just hardcoded -- and the repositories whitelist the column, so this only has to
 * decide what to send.
 *
 * It deliberately holds state and nothing else. An earlier version took the page's
 * fetch as a callback, which forced every caller to declare the composable before
 * its own fetch function and produced a forward reference. The page composes the
 * three steps itself instead: toggle, back to page one, refetch.
 */
export function useTableSort(defaultColumn: string, defaultDirection: SortDirection) {
  const orderBy = ref(defaultColumn)
  const orderDirection = ref<SortDirection>(defaultDirection)

  /**
   * Clicking the active column flips its direction; clicking a different one
   * starts that column ascending. Ascending first because the first click on a
   * name or a code almost always means "show me A first" -- defaulting to
   * descending reads as broken.
   */
  function toggle(column: string) {
    if (orderBy.value === column) {
      orderDirection.value = orderDirection.value === 'ASC' ? 'DESC' : 'ASC'
    }
    else {
      orderBy.value = column
      orderDirection.value = 'ASC'
    }
  }

  return { orderBy, orderDirection, toggle }
}
