import { describe, expect, it } from 'vitest'
import { DEFAULT_VAT_PERCENT, formatVatPercent, vatPercentToRate, vatRateToPercent } from '@/utils/vat'

// The seller types a percentage; the API and database keep a fraction. These pin
// the conversion in both directions.

describe('vatPercentToRate', () => {
  it('reads 11 as 11%', () => {
    expect(vatPercentToRate(11)).toBe(0.11)
  })

  it('accepts what a number field actually emits: a string', () => {
    expect(vatPercentToRate('11')).toBe(0.11)
    expect(vatPercentToRate('12.5')).toBe(0.125)
  })

  // NUMERIC(5,4): four decimals as a fraction, two as a percentage.
  it('rounds to what the database can store', () => {
    expect(vatPercentToRate(12.345)).toBe(0.1235)
    expect(vatPercentToRate(11.004)).toBe(0.11)
  })

  it('accepts 100%', () => {
    expect(vatPercentToRate(100)).toBe(1)
  })

  // A blank or half-typed field must not overwrite the stored rate.
  it('refuses blanks and text', () => {
    expect(vatPercentToRate('')).toBeNull()
    expect(vatPercentToRate('  ')).toBeNull()
    expect(vatPercentToRate(null)).toBeNull()
    expect(vatPercentToRate(undefined)).toBeNull()
    expect(vatPercentToRate('abc')).toBeNull()
  })

  it('refuses values outside 0–100%', () => {
    expect(vatPercentToRate(-1)).toBeNull()
    expect(vatPercentToRate(101)).toBeNull()
  })

  // The backend treats a rate of 0 as "not given" and substitutes 11% on create, so
  // accepting 0 here would quietly save something else.
  it('refuses 0%', () => {
    expect(vatPercentToRate(0)).toBeNull()
    expect(vatPercentToRate('0')).toBeNull()
  })

  it('does not mistake the old fraction input for a percentage', () => {
    // Someone used to the old field types 0.11: that is 0.11%, not 11%.
    expect(vatPercentToRate(0.11)).toBe(0.0011)
  })
})

describe('vatRateToPercent', () => {
  it('shows a stored 0.11 as 11', () => {
    expect(vatRateToPercent(0.11)).toBe(11)
  })

  it('hides float noise', () => {
    // A plain `rate * 100` would show these on screen: 0.07 * 100 is
    // 7.000000000000001 and 0.29 * 100 is 28.999999999999996.
    expect(0.07 * 100).not.toBe(7)
    expect(vatRateToPercent(0.07)).toBe(7)
    expect(vatRateToPercent(0.29)).toBe(29)
  })

  it('keeps fractional percentages', () => {
    expect(vatRateToPercent(0.125)).toBe(12.5)
  })

  it('round-trips with vatPercentToRate', () => {
    for (const percent of [1, 7.5, 11, 12, 12.35, 100])
      expect(vatRateToPercent(vatPercentToRate(percent)!)).toBe(percent)
  })
})

describe('formatVatPercent', () => {
  it('labels whole and fractional rates without trailing zeros', () => {
    expect(formatVatPercent(0.11)).toBe('11')
    expect(formatVatPercent(0.125)).toBe('12.5')
  })
})

describe('DEFAULT_VAT_PERCENT', () => {
  // Must match the backend's DefaultTaxRate (0.11).
  it('is 11%', () => {
    expect(DEFAULT_VAT_PERCENT / 100).toBe(0.11)
  })
})
