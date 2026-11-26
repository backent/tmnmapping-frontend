/**
 * Helpers for an autocomplete whose items come from a server search.
 *
 * Such a list is rebuilt on every query, and Vuetify renders the raw `v-model`
 * value — an id — whenever the items no longer contain the selected one. These keep
 * the selection resolvable regardless of what the latest search returned.
 */

export interface AutocompleteOption {
  title: string
  value: number
}

/**
 * The list to bind, with the current selection guaranteed present.
 *
 * Without this, any search that returns a different set (or nothing) leaves the
 * component holding a value it cannot label, and it falls back to printing the id.
 */
export function withSelectedOption(
  options: AutocompleteOption[],
  selected: AutocompleteOption | null,
): AutocompleteOption[] {
  if (!selected || options.some(option => option.value === selected.value))
    return options

  return [selected, ...options]
}

/**
 * Whether a search term is just the component echoing the current selection back.
 *
 * On blur Vuetify writes the chosen item's title into the search field. Treating
 * that as a fresh query searches for a formatted label — "Name (IRIS-123)" — which
 * matches nothing, and the empty result is what strips the selection of its title.
 */
export function isEchoOfSelection(term: string | null, selected: AutocompleteOption | null): boolean {
  if (!selected || !term)
    return false

  return term.trim() === selected.title
}
