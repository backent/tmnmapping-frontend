import { describe, expect, it } from 'vitest'
import { BUILDING_TYPE_CODES } from '@/config/buildingType'

describe('BUILDING_TYPE_CODES', () => {
  it('matches the Jira-defined code -> name pairs in row order', () => {
    expect(BUILDING_TYPE_CODES).toEqual([
      { code: 'AP', name: 'Apartment' },
      { code: 'OF', name: 'Office' },
      { code: 'HT', name: 'Hotel' },
      { code: 'MA', name: 'Mall' },
      { code: 'GC', name: 'Golf Course' },
      { code: 'TP', name: 'Tennis & Padel' },
      { code: 'YP', name: 'Yoga Pilates' },
      { code: 'DN', name: 'Dinning' },
      { code: 'SR', name: 'Spa & Reflexology' },
      { code: 'OT', name: 'Other' },
    ])
  })

  it('has unique codes', () => {
    const codes = BUILDING_TYPE_CODES.map(c => c.code)

    expect(new Set(codes).size).toBe(codes.length)
  })

  it('has unique names', () => {
    const names = BUILDING_TYPE_CODES.map(c => c.name)

    expect(new Set(names).size).toBe(names.length)
  })
})
