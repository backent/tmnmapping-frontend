import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { computeMarkerSize, getMarkerIconConfig } from '@/utils/markerUtils'
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

function makeSizeCtor() {
  return vi.fn(function (this: Record<string, number>, w: number, h: number) {
    this.w = w
    this.h = h
  }) as unknown as { new (w: number, h: number): { w: number; h: number } } & ReturnType<typeof vi.fn>
}

function makePointCtor() {
  return vi.fn(function (this: Record<string, number>, x: number, y: number) {
    this.x = x
    this.y = y
  }) as unknown as { new (x: number, y: number): { x: number; y: number } } & ReturnType<typeof vi.fn>
}

function setupGoogleMapsMock() {
  const SizeMock = makeSizeCtor()
  const PointMock = makePointCtor()

  vi.stubGlobal('google', { maps: { Size: SizeMock, Point: PointMock } })

  return { SizeMock, PointMock }
}

// Decode the SVG text from a data URL for assertion
function decodeSvgUrl(url: string): string {
  return decodeURIComponent(url.replace('data:image/svg+xml;charset=UTF-8,', ''))
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getMarkerIconConfig', () => {
  beforeEach(() => { setupGoogleMapsMock() })
  afterEach(() => { vi.unstubAllGlobals() })

  describe('when google maps is available', () => {
    it('returns a non-null icon object', () => {
      expect(getMarkerIconConfig(makeBuilding(), [], false)).not.toBeNull()
    })

    it('returns an object with url, scaledSize, and anchor', () => {
      const config = getMarkerIconConfig(makeBuilding(), [], false)

      expect(config).toHaveProperty('url')
      expect(config).toHaveProperty('scaledSize')
      expect(config).toHaveProperty('anchor')
    })

    it('url is an inline SVG data URL', () => {
      const config = getMarkerIconConfig(makeBuilding(), [], false)

      expect(config!.url).toMatch(/^data:image\/svg\+xml/)
    })

    describe('LCD presence → fill color', () => {
      it('null → opportunity color #8d91a9', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ lcd_presence_status: null }), [], false)!.url)

        expect(svg).toContain('#8d91a9')
      })

      it('"Opportunity" → #8d91a9', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'Opportunity' }), [], false)!.url)

        expect(svg).toContain('#8d91a9')
      })

      it('"TMN" → #0b97f3', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'TMN' }), [], false)!.url)

        expect(svg).toContain('#0b97f3')
      })

      it('"Competitor" → #913c92', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'Competitor' }), [], false)!.url)

        expect(svg).toContain('#913c92')
      })

      it('"CoExist" → #5ecce0', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'CoExist' }), [], false)!.url)

        expect(svg).toContain('#5ecce0')
      })

      it('unknown status → #8d91a9 (default)', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ lcd_presence_status: 'Unknown' }), [], false)!.url)

        expect(svg).toContain('#8d91a9')
      })
    })

    describe('building type → label (matching PNG markers)', () => {
      it('"Apartment" → "A"', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ building_type: 'Apartment' }), [], false)!.url)

        expect(svg).toContain('>A<')
      })

      it('"Hotel" → "H"', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ building_type: 'Hotel' }), [], false)!.url)

        expect(svg).toContain('>H<')
      })

      it('"Office" → "O"', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ building_type: 'Office' }), [], false)!.url)

        expect(svg).toContain('>O<')
      })

      it('"Retail" → "R"', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ building_type: 'Retail' }), [], false)!.url)

        expect(svg).toContain('>R<')
      })

      it('"Other" → "OT"', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ building_type: 'Other' }), [], false)!.url)

        expect(svg).toContain('>OT<')
      })

      it('unknown type → first letter uppercased', () => {
        const svg = decodeSvgUrl(getMarkerIconConfig(makeBuilding({ building_type: 'Warehouse' as any }), [], false)!.url)

        expect(svg).toContain('>W<')
      })
    })

    it('scaledSize is 30×40 at default zoom', () => {
      const SizeMock = makeSizeCtor()

      vi.stubGlobal('google', { maps: { Size: SizeMock, Point: makePointCtor() } })
      getMarkerIconConfig(makeBuilding(), [], false)
      expect(SizeMock).toHaveBeenCalledWith(30, 40)
    })

    it('anchor is at (15, 40) at default zoom', () => {
      const PointMock = makePointCtor()

      vi.stubGlobal('google', { maps: { Size: makeSizeCtor(), Point: PointMock } })
      getMarkerIconConfig(makeBuilding(), [], false)
      expect(PointMock).toHaveBeenCalledWith(15, 40)
    })

    describe('zoom-responsive sizing', () => {
      it('zoom 14 (base) → 30×40', () => {
        const SizeMock = makeSizeCtor()
        const PointMock = makePointCtor()

        vi.stubGlobal('google', { maps: { Size: SizeMock, Point: PointMock } })
        getMarkerIconConfig(makeBuilding(), [], false, 14)
        expect(SizeMock).toHaveBeenCalledWith(30, 40)
        expect(PointMock).toHaveBeenCalledWith(15, 40)
      })

      it('zoom 11 → smaller than base', () => {
        const SizeMock = makeSizeCtor()

        vi.stubGlobal('google', { maps: { Size: SizeMock, Point: makePointCtor() } })
        getMarkerIconConfig(makeBuilding(), [], false, 11)
        const [w, h] = SizeMock.mock.calls[0] as [number, number]

        expect(w).toBeLessThan(30)
        expect(h).toBeLessThan(40)
      })

      it('zoom 17 → clamped at base (30×40)', () => {
        const SizeMock = makeSizeCtor()

        vi.stubGlobal('google', { maps: { Size: SizeMock, Point: makePointCtor() } })
        getMarkerIconConfig(makeBuilding(), [], false, 17)
        expect(SizeMock).toHaveBeenCalledWith(30, 40)
      })

      it('zoom 20 → clamped at base (30×40)', () => {
        const SizeMock = makeSizeCtor()

        vi.stubGlobal('google', { maps: { Size: SizeMock, Point: makePointCtor() } })
        getMarkerIconConfig(makeBuilding(), [], false, 20)
        expect(SizeMock).toHaveBeenCalledWith(30, 40)
      })

      it('zoom 6 → clamped at 0.45× base (14×18)', () => {
        const SizeMock = makeSizeCtor()

        vi.stubGlobal('google', { maps: { Size: SizeMock, Point: makePointCtor() } })
        getMarkerIconConfig(makeBuilding(), [], false, 6)
        expect(SizeMock).toHaveBeenCalledWith(14, 18)
      })

      it('anchor = (width/2, height) at arbitrary zoom', () => {
        const SizeMock = makeSizeCtor()
        const PointMock = makePointCtor()

        vi.stubGlobal('google', { maps: { Size: SizeMock, Point: PointMock } })
        getMarkerIconConfig(makeBuilding(), [], false, 11)

        const [w, h] = SizeMock.mock.calls[0] as [number, number]
        const [ax, ay] = PointMock.mock.calls[0] as [number, number]

        expect(ax).toBe(Math.round(w / 2))
        expect(ay).toBe(h)
      })
    })
  })

  describe('computeMarkerSize', () => {
    it('returns base 30×40 at zoom 14', () => {
      expect(computeMarkerSize(14)).toEqual({ width: 30, height: 40 })
    })

    it('clamps at lower bound (0.45×) for very low zoom', () => {
      expect(computeMarkerSize(4)).toEqual({ width: 14, height: 18 })
    })

    it('clamps at upper bound (1.0×) for high zoom', () => {
      expect(computeMarkerSize(22)).toEqual({ width: 30, height: 40 })
    })

    it('scales monotonically when zooming out from base', () => {
      const smaller = computeMarkerSize(10)
      const small = computeMarkerSize(12)
      const base = computeMarkerSize(14)

      expect(smaller.width).toBeLessThan(small.width)
      expect(small.width).toBeLessThan(base.width)
    })

    it('does not grow past base when zooming in', () => {
      const base = computeMarkerSize(14)
      const zoomedIn = computeMarkerSize(18)

      expect(zoomedIn).toEqual(base)
    })
  })

  describe('when google maps is NOT available', () => {
    it('returns null when google is undefined', () => {
      vi.unstubAllGlobals()

      // @ts-expect-error - simulate missing Google Maps
      globalThis.google = undefined
      expect(getMarkerIconConfig(makeBuilding(), [], false)).toBeNull()
    })
  })
})
