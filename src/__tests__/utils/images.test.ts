import { describe, expect, it } from 'vitest'
import { BUILDING_IMAGE_SLOTS, buildingImageSlotLabel, buildingImageUrl, getImageProxyPath } from '@/utils/images'

describe('getImageProxyPath', () => {
  it('returns the value as-is when the path is an empty string', () => {
    expect(getImageProxyPath('')).toBe('')
  })

  it('proxies a full http:// URL by extracting the pathname', () => {
    expect(getImageProxyPath('http://example.com/images/photo.jpg'))
      .toBe('/api/erp-images/images/photo.jpg')
  })

  it('proxies a full https:// URL by extracting the pathname', () => {
    expect(getImageProxyPath('https://cdn.example.com/assets/img.png'))
      .toBe('/api/erp-images/assets/img.png')
  })

  it('preserves query parameters from an absolute URL', () => {
    expect(getImageProxyPath('https://example.com/image.jpg?width=200&height=100'))
      .toBe('/api/erp-images/image.jpg?width=200&height=100')
  })

  it('proxies a relative path that already starts with a leading slash', () => {
    expect(getImageProxyPath('/images/photo.jpg'))
      .toBe('/api/erp-images/images/photo.jpg')
  })

  it('proxies a relative path that does not start with a slash (adds one)', () => {
    expect(getImageProxyPath('images/photo.jpg'))
      .toBe('/api/erp-images/images/photo.jpg')
  })

  it('proxies a deeply nested relative path', () => {
    expect(getImageProxyPath('a/b/c/image.jpg'))
      .toBe('/api/erp-images/a/b/c/image.jpg')
  })

  it('proxies a root-level relative path', () => {
    expect(getImageProxyPath('/image.jpg'))
      .toBe('/api/erp-images/image.jpg')
  })

  it('handles an absolute URL with no path (root path)', () => {
    expect(getImageProxyPath('https://example.com/'))
      .toBe('/api/erp-images/')
  })
})

describe('buildingImageUrl', () => {
  it('asks the server for a slot, not a source', () => {
    // One URL answers for both: the server returns the photo this application hosts
    // when there is one and ERP's when there is not, so the caller never chooses.
    expect(buildingImageUrl(42, 'front')).toBe('/api/building-images/42/front')
  })

  // The URL is stable when a photo is REPLACED -- only the file behind it moves --
  // so without a changing query a browser would keep showing the old picture.
  it('busts the cache when told a version', () => {
    expect(buildingImageUrl(42, 'front', 1234)).toBe('/api/building-images/42/front?v=1234')
  })

  it('covers the same four slots ERP supplies, so the fallback is one-for-one', () => {
    expect(BUILDING_IMAGE_SLOTS).toEqual(['front', 'back', 'left', 'right_side'])
  })
})

describe('buildingImageSlotLabel', () => {
  it('reads right_side as Right Side', () => {
    expect(buildingImageSlotLabel('right_side')).toBe('Right Side')
    expect(buildingImageSlotLabel('front')).toBe('Front')
  })
})
