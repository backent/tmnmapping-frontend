/**
 * Query parameters for the server-side building picker.
 *
 * The picker is paginated by the server, so its filters have to travel with the
 * request: filtering in the browser would narrow only the rows already fetched and
 * silently hide the rest of the match.
 *
 * `GET /buildings` reads each of these fields as a comma-separated list and turns it
 * into a SQL `IN`, so a multi-select becomes one parameter.
 */

export const BUILDING_FILTER_FIELDS = [
  'building_type',
  'province',
  'citytown',
  'subdistrict',
] as const

export type BuildingFilterField = typeof BUILDING_FILTER_FIELDS[number]

export type BuildingFilters = Record<BuildingFilterField, string[]>

export function emptyBuildingFilters(): BuildingFilters {
  return { building_type: [], province: [], citytown: [], subdistrict: [] }
}

/**
 * Serialize the chosen filters into query parameters.
 *
 * An unset filter is omitted rather than sent empty: the API treats a present-but-
 * empty parameter as "no filter" today, but sending one would still be a lie about
 * what was asked for, and blank entries inside a list would reach SQL as real values.
 */
export function serializeBuildingFilters(filters: Partial<BuildingFilters>): Record<string, string> {
  const params: Record<string, string> = {}

  for (const field of BUILDING_FILTER_FIELDS) {
    const values = (filters[field] ?? [])
      .map(value => value.trim())
      .filter(Boolean)

    if (values.length)
      params[field] = values.join(',')
  }

  return params
}

/** How many filter fields are in use — for the "N filters applied" hint. */
export function countActiveFilters(filters: Partial<BuildingFilters>): number {
  return BUILDING_FILTER_FIELDS.reduce(
    (total, field) => total + ((filters[field]?.length ?? 0) > 0 ? 1 : 0),
    0,
  )
}

/**
 * Merge a fetched batch into the buildings staged in the picker.
 *
 * Two rules, both of which a bulk select makes easy to get wrong: a building already
 * attached to the package is never staged again, and staging is additive, so a
 * second "select all" under a different filter adds to the first rather than
 * replacing it. Keyed by id, so re-staging the same building is a no-op.
 */
export function mergeStagedSelection<T extends { id: number }>(
  staged: Map<number, T>,
  fetched: T[],
  alreadyAttached: Set<number>,
): Map<number, T> {
  const next = new Map(staged)

  for (const item of fetched) {
    if (!alreadyAttached.has(item.id))
      next.set(item.id, item)
  }

  return next
}
