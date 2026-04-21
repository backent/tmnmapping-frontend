import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { buildMappingBuildingsPayload, getMappingBuildings } from '@/http/mapping'
import { apiConfig } from '@/config/api'

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  }
}

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
  mockFetch.mockResolvedValue(createMockResponse({ data: { data: [], totals: {} } }))
})

afterEach(() => {
  mockFetch.mockReset()
  vi.unstubAllGlobals()
})

const BIG_POLYGON = Array.from({ length: 300 }, (_, i) => ({ lat: -6 + i * 0.001, lng: 106 + i * 0.001 }))

describe('getMappingBuildings', () => {
  // Regression: a 287-point polygon overflowed Nginx's URL buffer as a GET query string (HTTP 414).
  // The endpoint must POST a JSON body so polygon size does not affect the URL.
  it('issues a POST request to the mapping-buildings endpoint', async () => {
    await getMappingBuildings({ lcd_presence: ['TMN'] }, { lat: -6.2, lng: 106.8 })

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [url, init] = mockFetch.mock.calls[0]

    expect(url).toContain(apiConfig.endpoints.mapping_buildings)
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' })
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' })
  })

  it('sends the full polygon in the JSON body (not the URL)', async () => {
    await getMappingBuildings({ polygon: BIG_POLYGON }, { lat: 0, lng: 0 })

    const [url, init] = mockFetch.mock.calls[0]

    expect(url).not.toContain('polygon')
    const body = JSON.parse(init.body as string)

    expect(body.filters.polygon).toEqual(BIG_POLYGON)
  })

  it('forwards bounds as a typed object in the body', async () => {
    await getMappingBuildings(
      { lcd_presence: ['TMN'] },
      { lat: -6.2, lng: 106.8 },
      { minLat: -7, maxLat: -6, minLng: 106, maxLng: 107 },
    )

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)

    expect(body.bounds).toEqual({ minLat: -7, maxLat: -6, minLng: 106, maxLng: 107 })
  })

  it('sends bounds: null when no viewport is provided', async () => {
    await getMappingBuildings({ lcd_presence: ['TMN'] }, { lat: 0, lng: 0 })

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)

    expect(body.bounds).toBeNull()
  })
})

describe('buildMappingBuildingsPayload', () => {
  it('projects polygon through and keeps bounds separate', () => {
    const payload = buildMappingBuildingsPayload(
      { polygon: BIG_POLYGON, lcd_presence: ['TMN'] },
      { lat: 0, lng: 0 },
      { minLat: 1, maxLat: 2, minLng: 3, maxLng: 4 },
    )

    expect(payload.filters.polygon).toEqual(BIG_POLYGON)
    expect(payload.filters.lcd_presence).toEqual(['TMN'])
    expect(payload.bounds).toEqual({ minLat: 1, maxLat: 2, minLng: 3, maxLng: 4 })
    expect(payload.map_center).toEqual({ lat: 0, lng: 0 })
  })

  it('defaults bounds to null when omitted', () => {
    const payload = buildMappingBuildingsPayload({ lcd_presence: ['TMN'] }, { lat: 0, lng: 0 }, undefined)

    expect(payload.bounds).toBeNull()
  })
})
