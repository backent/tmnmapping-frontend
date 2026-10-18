/**
 * Filtering and bulk selection for the quotation wizard's building picker.
 *
 * The wizard holds every priced building in memory, so filtering and "select all
 * matching" are pure computation over that array — no round trip per page. These
 * live outside the component so the rules can be tested directly, and so the
 * component is left holding only state and markup.
 *
 * Everything here is written for a list of a few thousand: the search text is
 * indexed once, membership is asked through a Set, and a bulk action rebuilds the id
 * array once rather than once per building.
 */

import type { BuildingPrice } from '@/types/buildingprice'

/** A priceable building with its searchable text precomputed. */
export interface PriceableBuilding extends BuildingPrice {
  haystack: string
}

export interface BuildingFilter {
  term?: string | null
  types?: string[]
  cities?: string[]
}

/**
 * Index the list once, when it loads.
 *
 * Lowercasing inside the filter instead would re-walk every building on every
 * keystroke — the cost the 60-row cap used to hide.
 */
export function indexPriceableBuildings(list: BuildingPrice[]): PriceableBuilding[] {
  return list.map(b => ({
    ...b,
    haystack: `${b.building_name} ${b.building_iris_code} ${b.citytown} ${b.building_type}`.toLowerCase(),
  }))
}

/** Distinct, non-empty, alphabetically ordered — for the filter dropdowns. */
export function sortedUnique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

/**
 * Every building matching the filter. Type and city are OR within a field and AND
 * across fields, which is what a seller means by "apartments, in Jakarta or Bandung".
 *
 * An empty filter returns the original array rather than a copy: it is the common
 * case, and copying a few thousand entries per keystroke is waste.
 */
export function filterBuildings(
  buildings: PriceableBuilding[],
  filter: BuildingFilter,
): PriceableBuilding[] {
  const term = filter.term?.trim().toLowerCase() ?? ''
  const types = new Set(filter.types ?? [])
  const cities = new Set(filter.cities ?? [])

  if (!term && !types.size && !cities.size)
    return buildings

  return buildings.filter(b =>
    (!types.size || types.has(b.building_type))
    && (!cities.size || cities.has(b.citytown))
    && (!term || b.haystack.includes(term)))
}

/** How many of these buildings are already selected. */
export function countSelected(
  buildings: Pick<PriceableBuilding, 'building_id'>[],
  selected: Set<number>,
): number {
  let total = 0
  for (const b of buildings) {
    if (selected.has(b.building_id))
      total += 1
  }

  return total
}

/**
 * Add every given building to the selection.
 *
 * Adds rather than replaces: filtering narrows what is on screen, it does not undo
 * choices made under a different filter.
 */
export function addBuildings(selected: number[], buildings: Pick<PriceableBuilding, 'building_id'>[]): number[] {
  const ids = new Set(selected)
  for (const b of buildings)
    ids.add(b.building_id)

  return [...ids]
}

/** Remove only the given buildings, leaving anything selected under another filter. */
export function removeBuildings(selected: number[], buildings: Pick<PriceableBuilding, 'building_id'>[]): number[] {
  const ids = new Set(selected)
  for (const b of buildings)
    ids.delete(b.building_id)

  return [...ids]
}

/** Toggle one building. */
export function toggleBuilding(selected: number[], buildingId: number, on: boolean): number[] {
  const ids = new Set(selected)
  if (on)
    ids.add(buildingId)
  else ids.delete(buildingId)

  return [...ids]
}
