import { describe, expect, it } from 'vitest'
import { kFormatter } from '@core/utils/formatters'

describe('kFormatter', () => {
  describe('numbers within the ±9999 range (formatted with commas)', () => {
    it('formats 0', () => {
      expect(kFormatter(0)).toBe('0')
    })

    it('formats a 3-digit number without commas', () => {
      expect(kFormatter(100)).toBe('100')
    })

    it('formats 1000 with a comma', () => {
      expect(kFormatter(1000)).toBe('1,000')
    })

    it('formats 9999 with a comma', () => {
      expect(kFormatter(9999)).toBe('9,999')
    })

    it('formats 1234 with a comma', () => {
      expect(kFormatter(1234)).toBe('1,234')
    })

    it('strips the negative sign for negative numbers within range (known behavior)', () => {
      // Math.abs is used for this branch, so sign is lost for numbers <= 9999
      expect(kFormatter(-5000)).toBe('5,000')
    })
  })

  describe('numbers beyond ±9999 (formatted as k-notation)', () => {
    it('formats 10000 as 10k', () => {
      expect(kFormatter(10000)).toBe('10k')
    })

    it('formats 15500 as 15.5k', () => {
      expect(kFormatter(15500)).toBe('15.5k')
    })

    it('formats 100000 as 100k', () => {
      expect(kFormatter(100000)).toBe('100k')
    })

    it('formats 1000000 as 1000k', () => {
      expect(kFormatter(1000000)).toBe('1000k')
    })

    it('formats negative -10000 as -10k (sign preserved in k-range)', () => {
      expect(kFormatter(-10000)).toBe('-10k')
    })

    it('formats negative -25600 as -25.6k', () => {
      expect(kFormatter(-25600)).toBe('-25.6k')
    })
  })

  describe('boundary values', () => {
    it('treats 9999 as within range (no k suffix)', () => {
      expect(kFormatter(9999)).not.toContain('k')
    })

    it('treats 10000 as above range (k suffix applied)', () => {
      expect(kFormatter(10000)).toContain('k')
    })
  })
})
