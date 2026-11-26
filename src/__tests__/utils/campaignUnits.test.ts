import { describe, expect, it } from 'vitest'
import {
  BASE_TVC_DURATION_SECONDS,
  LEGACY_SPOTS_BASE,
  SPOTS_BASES,
  SPOTS_CHOICES,
  SPOTS_DROPDOWN_ITEMS,
  SPOTS_OPTIONS,
  TVC_DURATION_OPTIONS,
  durationLabel,
  editableSpotsBase,
  inferSpotsBase,
  parseSpotsChoice,
  rateMultiplier,
  spotsChoiceKey,
  spotsLabel,
  spotsMultiplier,
  unitMultiplier,
} from '@/utils/campaignUnits'

// These must stay in step with services/quotation/pricing.go: the server refuses
// anything off the ladder, so offering a value it would reject is a broken form.
// Spot bases 60 and 90 since 2026-11-15 (it was one base, 180).
describe('the ladders', () => {
  it('offers the base unit and its multiples up to five', () => {
    expect(TVC_DURATION_OPTIONS).toEqual([15, 30, 45, 60, 75])
    expect(TVC_DURATION_OPTIONS[0]).toBe(BASE_TVC_DURATION_SECONDS)
    expect(SPOTS_BASES).toEqual([60, 90])
    expect(SPOTS_OPTIONS).toEqual([60, 90, 120, 180, 240, 270, 300, 360, 450])
  })

  it('offers 180 once per base, since its price depends on the base', () => {
    expect(SPOTS_CHOICES.filter(c => c.spots === 180)).toEqual([{ spots: 180, base: 60 }, { spots: 180, base: 90 }])
    expect(SPOTS_CHOICES).toHaveLength(10)
  })

  it('labels each entry with its base and multiplier', () => {
    expect(SPOTS_DROPDOWN_ITEMS.map(i => i.title)).toEqual([
      '60 spots (base rate)',
      '90 spots (base rate)',
      '120 spots (60 × 2)',
      '180 spots (60 × 3)',
      '180 spots (90 × 2)',
      '240 spots (60 × 4)',
      '270 spots (90 × 3)',
      '300 spots (60 × 5)',
      '360 spots (90 × 4)',
      '450 spots (90 × 5)',
    ])
  })
})

describe('the spots dropdown value', () => {
  it('round-trips a frequency and its base', () => {
    expect(parseSpotsChoice(spotsChoiceKey(180, 60))).toEqual({ spots: 180, base: 60 })
    expect(parseSpotsChoice(spotsChoiceKey(180, 90))).toEqual({ spots: 180, base: 90 })
  })

  it('refuses a pair that is not offered', () => {
    expect(parseSpotsChoice(spotsChoiceKey(120, 90))).toBeNull()
    expect(parseSpotsChoice(spotsChoiceKey(180, 180))).toBeNull()
    expect(parseSpotsChoice('nonsense')).toBeNull()
  })
})

describe('unitMultiplier', () => {
  it('counts how many base units a value buys', () => {
    expect(unitMultiplier(15, 15)).toBe(1)
    expect(unitMultiplier(60, 15)).toBe(4)
    expect(unitMultiplier(450, 90)).toBe(5)
  })

  it('rejects values off the ladder or beyond the cap', () => {
    expect(unitMultiplier(20, 15)).toBe(0)
    expect(unitMultiplier(120, 90)).toBe(0)
    expect(unitMultiplier(90, 15)).toBe(0)
    expect(unitMultiplier(360, 60)).toBe(0)
  })

  it('rejects zero, negatives and fractions', () => {
    expect(unitMultiplier(0, 15)).toBe(0)
    expect(unitMultiplier(-15, 15)).toBe(0)
    expect(unitMultiplier(22.5, 15)).toBe(0)
  })
})

describe('spots bases', () => {
  it('infers 90 where both bases reach a value, as the server does', () => {
    expect(inferSpotsBase(180)).toBe(90)
    expect(inferSpotsBase(120)).toBe(60)
    expect(inferSpotsBase(540)).toBe(0)
  })

  it('edits a legacy selection on the inferred base', () => {
    expect(editableSpotsBase(180, LEGACY_SPOTS_BASE)).toBe(90)
    expect(editableSpotsBase(180, 60)).toBe(60)
    expect(editableSpotsBase(120, undefined)).toBe(60)
  })

  it('reads the multiplier a legacy selection was priced with', () => {
    expect(spotsMultiplier(180, LEGACY_SPOTS_BASE)).toBe(1)
    expect(spotsMultiplier(180, 60)).toBe(3)
    expect(spotsMultiplier(180, 45)).toBe(0)
  })
})

describe('rateMultiplier', () => {
  // 60 and 90 spots both cost the base rate; more multiplies on the base picked.
  it('is one at either base unit', () => {
    expect(rateMultiplier(15, 60, 60)).toBe(1)
    expect(rateMultiplier(15, 90, 90)).toBe(1)
  })

  it('multiplies on the chosen base', () => {
    expect(rateMultiplier(15, 120, 60)).toBe(2)
    expect(rateMultiplier(15, 270, 90)).toBe(3)
    expect(rateMultiplier(15, 180, 60)).toBe(3)
    expect(rateMultiplier(15, 180, 90)).toBe(2)
  })

  it('compounds duration and spots', () => {
    expect(rateMultiplier(30, 180, 90)).toBe(4)
    expect(rateMultiplier(75, 450, 90)).toBe(25)
  })

  it('is zero off the ladder, or on the legacy base', () => {
    expect(rateMultiplier(20, 90, 90)).toBe(0)
    expect(rateMultiplier(15, 120, 90)).toBe(0)
    expect(rateMultiplier(15, 180, LEGACY_SPOTS_BASE)).toBe(0)
  })
})

describe('labels', () => {
  it('names the base rate and the multiples', () => {
    expect(durationLabel(15)).toBe('15s (base rate)')
    expect(durationLabel(30)).toBe('30s (×2)')
    expect(spotsLabel(90, 90)).toBe('90 spots (base rate)')
    expect(spotsLabel(270, 90)).toBe('270 spots (90 × 3)')
  })
})
