import { describe, expect, it } from 'vitest'
import {
  addBuildings,
  countSelected,
  filterBuildings,
  indexPriceableBuildings,
  removeBuildings,
  sortedUnique,
  toggleBuilding,
} from '@/utils/buildingPicker'
import type { BuildingPrice } from '@/types/buildingprice'

function price(over: Partial<BuildingPrice> & { building_id: number }): BuildingPrice {
  return {
    id: over.building_id,
    building_id: over.building_id,
    building_name: over.building_name ?? `Building ${over.building_id}`,
    building_iris_code: over.building_iris_code ?? `IRIS-${over.building_id}`,
    building_type: over.building_type ?? 'Apartment',
    citytown: over.citytown ?? 'Jakarta',
    price_idr_per_week: over.price_idr_per_week ?? 1_000_000,
    created_at: '',
    updated_at: '',
  }
}

const catalogue = indexPriceableBuildings([
  price({ building_id: 1, building_name: 'Menara Astra', citytown: 'Jakarta', building_type: 'Office' }),
  price({ building_id: 2, building_name: 'Green Bay', citytown: 'Jakarta', building_type: 'Apartment' }),
  price({ building_id: 3, building_name: 'Paskal Hyper', citytown: 'Bandung', building_type: 'Mall' }),
  price({ building_id: 4, building_name: 'Grand Sungkono', citytown: 'Surabaya', building_type: 'Apartment' }),
])

describe('indexPriceableBuildings', () => {
  it('indexes name, IRIS code, city and type as one lowercase haystack', () => {
    const [first] = indexPriceableBuildings([
      price({ building_id: 9, building_name: 'Menara ASTRA', building_iris_code: 'IRIS-XYZ', citytown: 'Jakarta', building_type: 'Office' }),
    ])

    expect(first.haystack).toBe('menara astra iris-xyz jakarta office')
  })
})

describe('filterBuildings', () => {
  it('returns everything when no filter is set', () => {
    expect(filterBuildings(catalogue, {})).toHaveLength(4)
  })

  // The old picker searched name and city only, while displaying the IRIS code.
  it('matches on the IRIS code, not just the name', () => {
    expect(filterBuildings(catalogue, { term: 'iris-3' }).map(b => b.building_id)).toEqual([3])
  })

  it('is case-insensitive and ignores surrounding space', () => {
    expect(filterBuildings(catalogue, { term: '  MENARA ' }).map(b => b.building_id)).toEqual([1])
  })

  it('treats several types as OR', () => {
    expect(filterBuildings(catalogue, { types: ['Mall', 'Office'] }).map(b => b.building_id))
      .toEqual([1, 3])
  })

  it('treats type and city as AND across fields', () => {
    expect(filterBuildings(catalogue, { types: ['Apartment'], cities: ['Jakarta'] })
      .map(b => b.building_id)).toEqual([2])
  })

  it('combines search with the dropdowns', () => {
    expect(filterBuildings(catalogue, { term: 'bay', cities: ['Jakarta'] })
      .map(b => b.building_id)).toEqual([2])
  })

  it('returns nothing when the filters exclude each other', () => {
    expect(filterBuildings(catalogue, { types: ['Mall'], cities: ['Surabaya'] })).toEqual([])
  })

  it('treats a cleared search field as no filter', () => {
    // VTextField with `clearable` sets null, not ''.
    expect(filterBuildings(catalogue, { term: null })).toHaveLength(4)
  })
})

describe('sortedUnique', () => {
  it('drops blanks and duplicates, and orders alphabetically', () => {
    expect(sortedUnique(['Mall', '', 'Apartment', 'Mall'])).toEqual(['Apartment', 'Mall'])
  })
})

describe('bulk selection', () => {
  // The reason the whole filtered array is passed around rather than a rendered
  // page: "select all" has to mean every match, not the visible rows.
  it('adds every filtered building at once', () => {
    const filtered = filterBuildings(catalogue, { cities: ['Jakarta'] })

    expect(addBuildings([], filtered).sort()).toEqual([1, 2])
  })

  it('keeps buildings chosen under a different filter', () => {
    const jakarta = filterBuildings(catalogue, { cities: ['Jakarta'] })
    const bandung = filterBuildings(catalogue, { cities: ['Bandung'] })

    const selected = addBuildings(addBuildings([], jakarta), bandung)

    expect(selected.sort()).toEqual([1, 2, 3])
  })

  it('never selects the same building twice', () => {
    const jakarta = filterBuildings(catalogue, { cities: ['Jakarta'] })

    expect(addBuildings([1, 2], jakarta).sort()).toEqual([1, 2])
  })

  it('deselects only what the filter shows', () => {
    const jakarta = filterBuildings(catalogue, { cities: ['Jakarta'] })

    expect(removeBuildings([1, 2, 3], jakarta)).toEqual([3])
  })

  it('counts how many of the filtered buildings are already selected', () => {
    const jakarta = filterBuildings(catalogue, { cities: ['Jakarta'] })

    expect(countSelected(jakarta, new Set([2, 3]))).toBe(1)
  })

  it('toggles one building on and off', () => {
    expect(toggleBuilding([1], 2, true).sort()).toEqual([1, 2])
    expect(toggleBuilding([1, 2], 2, false)).toEqual([1])
  })

  it('leaves the original array untouched', () => {
    const selected = [1]

    addBuildings(selected, catalogue)
    removeBuildings(selected, catalogue)
    toggleBuilding(selected, 2, true)

    expect(selected).toEqual([1])
  })
})

describe('scale', () => {
  // A "select all" over the whole priced catalogue is the case this was built for.
  it('filters and selects a few thousand buildings without breaking a sweat', () => {
    const many = indexPriceableBuildings(
      Array.from({ length: 3000 }, (_, i) => price({
        building_id: i + 1,
        citytown: i % 2 ? 'Jakarta' : 'Bandung',
      })),
    )

    const jakarta = filterBuildings(many, { cities: ['Jakarta'] })
    const selected = addBuildings([], jakarta)

    expect(jakarta).toHaveLength(1500)
    expect(selected).toHaveLength(1500)
    expect(countSelected(jakarta, new Set(selected))).toBe(1500)
  })
})
