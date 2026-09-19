import { describe, expect, it } from 'vitest'
import {
  BASE_SPOTS_PER_DAY,
  BASE_TVC_DURATION_SECONDS,
  SPOTS_OPTIONS,
  TVC_DURATION_OPTIONS,
  durationLabel,
  rateMultiplier,
  spotsLabel,
  unitMultiplier,
} from '@/utils/campaignUnits'

// These must stay in step with services/quotation/pricing.go: the server refuses
// anything off the ladder, so offering a value it would reject is a broken form.
describe('the ladders', () => {
  it('offers the base unit and its multiples up to five', () => {
    expect(TVC_DURATION_OPTIONS).toEqual([15, 30, 45, 60, 75])
    expect(SPOTS_OPTIONS).toEqual([180, 360, 540, 720, 900])
  })

  it('starts each ladder at the base unit a price buys', () => {
    expect(TVC_DURATION_OPTIONS[0]).toBe(BASE_TVC_DURATION_SECONDS)
    expect(SPOTS_OPTIONS[0]).toBe(BASE_SPOTS_PER_DAY)
  })
})

describe('unitMultiplier', () => {
  it('counts how many base units a value buys', () => {
    expect(unitMultiplier(15, 15)).toBe(1)
    expect(unitMultiplier(60, 15)).toBe(4)
    expect(unitMultiplier(900, 180)).toBe(5)
  })

  it('rejects values off the ladder', () => {
    expect(unitMultiplier(20, 15)).toBe(0)
    expect(unitMultiplier(200, 180)).toBe(0)
  })

  it('rejects values beyond the cap', () => {
    expect(unitMultiplier(90, 15)).toBe(0)
    expect(unitMultiplier(1080, 180)).toBe(0)
  })

  it('rejects zero, negatives and fractions', () => {
    expect(unitMultiplier(0, 15)).toBe(0)
    expect(unitMultiplier(-15, 15)).toBe(0)
    expect(unitMultiplier(22.5, 15)).toBe(0)
  })
})

describe('rateMultiplier', () => {
  // The rule the business gave: a price buys 15s at 180 spots, and both dimensions
  // multiply through it.
  it('is one at the base unit', () => {
    expect(rateMultiplier(15, 180)).toBe(1)
  })

  it('compounds duration and spots', () => {
    expect(rateMultiplier(30, 180)).toBe(2)
    expect(rateMultiplier(15, 360)).toBe(2)
    expect(rateMultiplier(30, 360)).toBe(4)
    expect(rateMultiplier(75, 900)).toBe(25)
  })

  it('is zero when either value is off the ladder, so nothing is quoted', () => {
    expect(rateMultiplier(20, 180)).toBe(0)
    expect(rateMultiplier(15, 200)).toBe(0)
  })
})

describe('labels', () => {
  it('names the base unit as the base rate rather than "×1"', () => {
    expect(durationLabel(15)).toBe('15s (base rate)')
    expect(spotsLabel(180)).toBe('180 spots (base rate)')
  })

  it('shows what a longer spot or higher frequency costs', () => {
    expect(durationLabel(45)).toBe('45s (×3)')
    expect(spotsLabel(720)).toBe('720 spots (×4)')
  })
})
