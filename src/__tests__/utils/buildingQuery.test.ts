import { describe, expect, it } from 'vitest'
import {
  BUILDING_FILTER_FIELDS,
  countActiveFilters,
  emptyBuildingFilters,
  mergeStagedSelection,
  serializeBuildingFilters,
} from '@/utils/buildingQuery'

describe('serializeBuildingFilters', () => {
  it('sends nothing when no filter is chosen', () => {
    expect(serializeBuildingFilters(emptyBuildingFilters())).toEqual({})
  })

  it('sends one field as a plain value', () => {
    expect(serializeBuildingFilters({ citytown: ['Jakarta'] })).toEqual({ citytown: 'Jakarta' })
  })

  // The API turns a comma-separated value into a SQL IN, which is what makes the
  // dropdowns multi-select in the first place.
  it('joins several values with commas', () => {
    expect(serializeBuildingFilters({ building_type: ['Mall', 'Office'] }))
      .toEqual({ building_type: 'Mall,Office' })
  })

  it('combines fields, which the API ANDs together', () => {
    expect(serializeBuildingFilters({
      building_type: ['Apartment'],
      province: ['DKI Jakarta'],
      citytown: ['Jakarta Selatan', 'Jakarta Pusat'],
      subdistrict: [],
    })).toEqual({
      building_type: 'Apartment',
      province: 'DKI Jakarta',
      citytown: 'Jakarta Selatan,Jakarta Pusat',
    })
  })

  // A blank entry would otherwise reach SQL as a real value and match nothing.
  it('drops blank and whitespace-only values', () => {
    expect(serializeBuildingFilters({ province: ['', '  ', 'Banten'] }))
      .toEqual({ province: 'Banten' })
  })

  it('omits a field left empty by blanks alone', () => {
    expect(serializeBuildingFilters({ province: ['', '   '] })).toEqual({})
  })

  it('trims values so the query carries no stray spaces', () => {
    expect(serializeBuildingFilters({ citytown: [' Bandung '] })).toEqual({ citytown: 'Bandung' })
  })

  it('tolerates a partial filter object', () => {
    expect(serializeBuildingFilters({})).toEqual({})
  })
})

describe('countActiveFilters', () => {
  it('counts fields in use, not values', () => {
    expect(countActiveFilters({ citytown: ['Jakarta', 'Bandung'] })).toBe(1)
    expect(countActiveFilters({ citytown: ['Jakarta'], province: ['Banten'] })).toBe(2)
  })

  it('is zero for a cleared filter set', () => {
    expect(countActiveFilters(emptyBuildingFilters())).toBe(0)
  })
})

describe('filter fields', () => {
  // Each filter must correspond to a column the picker table actually shows,
  // otherwise a user cannot see why a row matched.
  it('covers exactly the columns the picker displays', () => {
    expect([...BUILDING_FILTER_FIELDS]).toEqual([
      'building_type', 'province', 'citytown', 'subdistrict',
    ])
  })

  it('starts every field empty', () => {
    const filters = emptyBuildingFilters()

    for (const field of BUILDING_FILTER_FIELDS)
      expect(filters[field]).toEqual([])
  })
})

describe('mergeStagedSelection', () => {
  const one = { id: 1, name: 'One' }
  const two = { id: 2, name: 'Two' }
  const three = { id: 3, name: 'Three' }

  it('stages a fetched batch', () => {
    const merged = mergeStagedSelection(new Map(), [one, two], new Set())

    expect([...merged.keys()]).toEqual([1, 2])
  })

  // Already-attached buildings are excluded server-side too, but a stale page or a
  // race would otherwise stage a duplicate the user would have to remove by hand.
  it('never stages a building already attached to the package', () => {
    const merged = mergeStagedSelection(new Map(), [one, two], new Set([1]))

    expect([...merged.keys()]).toEqual([2])
  })

  // Selecting all of Jakarta, then all of Bandung, should give both.
  it('adds to what is already staged rather than replacing it', () => {
    const first = mergeStagedSelection(new Map(), [one], new Set())
    const second = mergeStagedSelection(first, [two, three], new Set())

    expect([...second.keys()]).toEqual([1, 2, 3])
  })

  it('is a no-op for a building already staged', () => {
    const first = mergeStagedSelection(new Map(), [one, two], new Set())
    const second = mergeStagedSelection(first, [one], new Set())

    expect(second.size).toBe(2)
  })

  it('leaves the original map untouched', () => {
    const staged = new Map([[1, one]])

    mergeStagedSelection(staged, [two], new Set())

    expect(staged.size).toBe(1)
  })

  it('handles an empty fetch', () => {
    const staged = new Map([[1, one]])

    expect(mergeStagedSelection(staged, [], new Set()).size).toBe(1)
  })
})
