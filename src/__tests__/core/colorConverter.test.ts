import { describe, expect, it } from 'vitest'
import { hexToRgb, rgbaToHex } from '@core/utils/colorConverter'

describe('hexToRgb', () => {
  it('converts a full 6-digit hex to RGB string', () => {
    expect(hexToRgb('#ff0000')).toBe('255,0,0')
  })

  it('converts a 3-digit shorthand hex to RGB string', () => {
    expect(hexToRgb('#f00')).toBe('255,0,0')
  })

  it('converts hex without # prefix', () => {
    expect(hexToRgb('ff0000')).toBe('255,0,0')
  })

  it('converts white (#ffffff)', () => {
    expect(hexToRgb('#ffffff')).toBe('255,255,255')
  })

  it('converts black (#000000)', () => {
    expect(hexToRgb('#000000')).toBe('0,0,0')
  })

  it('converts a mixed-color hex', () => {
    expect(hexToRgb('#1a2b3c')).toBe('26,43,60')
  })

  it('handles uppercase hex letters', () => {
    expect(hexToRgb('#FF0000')).toBe('255,0,0')
  })

  it('handles 3-digit shorthand without # (edge case)', () => {
    expect(hexToRgb('f00')).toBe('255,0,0')
  })

  it('returns null for an invalid hex string', () => {
    expect(hexToRgb('invalid')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(hexToRgb('')).toBeNull()
  })
})

describe('rgbaToHex', () => {
  it('converts rgb() string to hex', () => {
    expect(rgbaToHex('rgb(255, 0, 0)')).toBe('#ff0000')
  })

  it('converts rgba() string to hex with alpha channel', () => {
    // alpha 1 → 255 (0xff)
    expect(rgbaToHex('rgba(255, 0, 0, 1)')).toBe('#ff0000ff')
  })

  it('removes alpha channel when forceRemoveAlpha is true', () => {
    expect(rgbaToHex('rgba(255, 0, 0, 1)', true)).toBe('#ff0000')
  })

  it('converts rgba with 0 alpha to hex', () => {
    // alpha 0 → 0 (0x00)
    expect(rgbaToHex('rgba(0, 0, 0, 0)')).toBe('#00000000')
  })

  it('converts white rgb to hex', () => {
    expect(rgbaToHex('rgb(255, 255, 255)')).toBe('#ffffff')
  })

  it('converts black rgb to hex', () => {
    expect(rgbaToHex('rgb(0, 0, 0)')).toBe('#000000')
  })

  it('converts rgba with 0.5 alpha correctly', () => {
    // alpha 0.5 → 0.5 * 255 = 127.5 → Math.round(127.5) = 128 = 0x80
    expect(rgbaToHex('rgba(0, 0, 0, 0.5)')).toBe('#00000080')
  })

  it('pads single-digit hex values with leading zero', () => {
    // R=0, G=0, B=15 → 0, 0, 0f → #00000f
    expect(rgbaToHex('rgb(0, 0, 15)')).toBe('#00000f')
  })
})
