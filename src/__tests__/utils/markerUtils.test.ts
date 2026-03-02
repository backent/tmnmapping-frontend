import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getMarkerIconConfig } from '@/utils/markerUtils'
import type { MappingBuilding } from '@/types/mapping'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBuilding(overrides: Partial<MappingBuilding> = {}): MappingBuilding {
  return {
    id: 1,
    building_name: 'Test Building',
    building_type: 'Apartment',
    address: 'Jl. Test No. 1, Jakarta',
    coordinates: { lat: -6.2, lng: 106.8 },
    latitude: -6.2,
    longitude: 106.8,
    lcd_presence_status: null,
    tower_id: null,
    screen_installed: null,
    fmi: 'No',
    dfi: 'No',
    other: 'No',
    installation: 'incomplete',
    status: 'active',
    building_grade: 'Grade A',
    last_renovated: null,
    completion_year: null,
    no_of_floors: null,
    units: null,
    photos: { data: [] },
    job_detail_info: [],
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Google Maps mock
// ---------------------------------------------------------------------------

// google.maps.Size and Point are called with `new`, so they must be
// constructor-compatible functions, not arrow functions.
function makeSizeCtor() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const ctor = vi.fn(function (this: Record<string, number>, w: number, h: number) {
    this.w = w
    this.h = h
  }) as unknown as { new (w: number, h: number): { w: number; h: number } } & ReturnType<typeof vi.fn>
  return ctor
}

function makePointCtor() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  const ctor = vi.fn(function (this: Record<string, number>, x: number, y: number) {
    this.x = x
    this.y = y
  }) as unknown as { new (x: number, y: number): { x: number; y: number } } & ReturnType<typeof vi.fn>
  return ctor
}

function setupGoogleMapsMock() {
  const SizeMock = makeSizeCtor()
  const PointMock = makePointCtor()

  vi.stubGlobal('google', {
    maps: {
      Size: SizeMock,
      Point: PointMock,
    },
  })

  return { SizeMock, PointMock }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getMarkerIconConfig', () => {
  beforeEach(() => {
    setupGoogleMapsMock()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('when google maps is available', () => {
    it('returns an icon object (not null)', () => {
      const config = getMarkerIconConfig(makeBuilding(), [], false)
      expect(config).not.toBeNull()
    })

    it('returns an object with url, scaledSize, and anchor properties', () => {
      const config = getMarkerIconConfig(makeBuilding(), [], false)
      expect(config).toHaveProperty('url')
      expect(config).toHaveProperty('scaledSize')
      expect(config).toHaveProperty('anchor')
    })

    describe('LCD presence → colour mapping', () => {
      it('maps null lcd_presence_status to gray marker', () => {
        const config = getMarkerIconConfig(makeBuilding({ lcd_presence_status: null }), [], false)
        expect(config!.url).toContain('gray')
      })

      it('maps "Opportunity" to a gray marker', () => {
        const config = getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'Opportunity' }), [], false)
        expect(config!.url).toContain('gray')
      })

      it('maps "TMN" to a blue marker', () => {
        const config = getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'TMN' }), [], false)
        expect(config!.url).toContain('blue')
      })

      it('maps "Competitor" to a red marker', () => {
        const config = getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'Competitor' }), [], false)
        expect(config!.url).toContain('red')
      })

      it('maps "CoExist" to a blue marker', () => {
        const config = getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'CoExist' }), [], false)
        expect(config!.url).toContain('blue')
      })

      it('maps an unknown status to gray (default case)', () => {
        const config = getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'Unknown' }), [], false)
        expect(config!.url).toContain('gray')
      })
    })

    describe('building type → icon path mapping', () => {
      it('uses "apartment" in the path for Apartment type', () => {
        const config = getMarkerIconConfig(makeBuilding({ building_type: 'Apartment' }), [], false)
        expect(config!.url).toContain('apartment')
      })

      it('uses "hotel" in the path for Hotel type', () => {
        const config = getMarkerIconConfig(makeBuilding({ building_type: 'Hotel' }), [], false)
        expect(config!.url).toContain('hotel')
      })

      it('uses "office" in the path for Office type', () => {
        const config = getMarkerIconConfig(makeBuilding({ building_type: 'Office' }), [], false)
        expect(config!.url).toContain('office')
      })

      it('uses "retail" in the path for Retail type', () => {
        const config = getMarkerIconConfig(makeBuilding({ building_type: 'Retail' }), [], false)
        expect(config!.url).toContain('retail')
      })

      it('uses "other" in the path for Other type', () => {
        const config = getMarkerIconConfig(makeBuilding({ building_type: 'Other' }), [], false)
        expect(config!.url).toContain('other')
      })
    })

    it('produces a URL in the format /marker/<type>-<color>.png', () => {
      const config = getMarkerIconConfig(
        makeBuilding({ building_type: 'Office', lcd_presence_status: 'TMN' }),
        [],
        false,
      )
      expect(config!.url).toBe('/marker/office-blue.png')
    })

    it('scaledSize is constructed with width=30 and height=40', () => {
      const SizeMock = makeSizeCtor()
      vi.stubGlobal('google', { maps: { Size: SizeMock, Point: makePointCtor() } })
      getMarkerIconConfig(makeBuilding(), [], false)
      expect(SizeMock).toHaveBeenCalledWith(30, 40)
    })

    it('anchor is constructed at point (15, 40)', () => {
      const PointMock = makePointCtor()
      vi.stubGlobal('google', { maps: { Size: makeSizeCtor(), Point: PointMock } })
      getMarkerIconConfig(makeBuilding(), [], false)
      expect(PointMock).toHaveBeenCalledWith(15, 40)
    })
  })

  describe('when google maps is NOT available', () => {
    it('returns null when google is undefined', () => {
      vi.unstubAllGlobals()
      // @ts-expect-error - simulate missing Google Maps
      globalThis.google = undefined

      const config = getMarkerIconConfig(makeBuilding(), [], false)
      expect(config).toBeNull()
    })
  })
})
