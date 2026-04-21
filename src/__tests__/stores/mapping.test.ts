import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { __resetLoadingSmoothingForTests, useMappingStore } from '@/stores/mapping'

import { getMappingBuildings } from '@/http/mapping'

vi.mock('@/http/mapping', () => ({
  getMappingBuildings: vi.fn(),
  getMappingFilterOptions: vi.fn(),
  searchRegions: vi.fn(),
  searchScreenTypes: vi.fn(),
  getScreenTypes: vi.fn(),
  getYearList: vi.fn(),
  getPotentialClients: vi.fn(),
  getPotentialClientById: vi.fn(),
  buildExportPayload: vi.fn(),
  exportMappingDataByFilters: vi.fn(),
}))

const POLYGON_A = [
  { lat: 1, lng: 1 },
  { lat: 1, lng: 2 },
  { lat: 2, lng: 2 },
]
const POLYGON_B = [
  { lat: 10, lng: 10 },
  { lat: 10, lng: 11 },
  { lat: 11, lng: 11 },
]

describe('useMappingStore fit-to-polygon counter', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    __resetLoadingSmoothingForTests()
    vi.mocked(getMappingBuildings).mockResolvedValue({ data: { data: [], totals: {} } })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('initializes fitBoundsToPolygon counter at 0', () => {
    const store = useMappingStore()

    expect(store.fitBoundsToPolygon).toBe(0)
  })

  it('increments the counter each time a fit is requested', () => {
    const store = useMappingStore()

    store.setFitBoundsToPolygon(true)
    expect(store.fitBoundsToPolygon).toBe(1)

    store.setFitBoundsToPolygon(true)
    expect(store.fitBoundsToPolygon).toBe(2)

    store.setFitBoundsToPolygon()
    expect(store.fitBoundsToPolygon).toBe(3)
  })

  it('leaves the counter unchanged when called with false', () => {
    const store = useMappingStore()

    store.setFitBoundsToPolygon(true)
    store.setFitBoundsToPolygon(false)

    expect(store.fitBoundsToPolygon).toBe(1)
  })

  // Regression: when switching directly between two saved polygons (A → B) without
  // clearing in between, the fit counter must advance both times so MapView refocuses
  // on each new polygon. Previously a boolean flag could miss the second request.
  it('advances the counter when switching from polygon A to polygon B', async () => {
    const store = useMappingStore()

    await store.setPolygon(POLYGON_A)
    store.setFitBoundsToPolygon(true)
    const afterFirstRequest = store.fitBoundsToPolygon

    await store.setPolygon(POLYGON_B)
    store.setFitBoundsToPolygon(true)
    const afterSecondRequest = store.fitBoundsToPolygon

    expect(afterSecondRequest).toBeGreaterThan(afterFirstRequest)
    expect(store.filters.polygon).toEqual(POLYGON_B)
  })
})

describe('useMappingStore loading smoothing', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    __resetLoadingSmoothingForTests()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  // Regression: on fast responses the loader would flash for a single frame.
  // A fetch that resolves before the show-delay must never flip isLoadingVisible.
  it('does not show the overlay when the fetch resolves before the show-delay', async () => {
    vi.useFakeTimers()
    vi.mocked(getMappingBuildings).mockResolvedValue({ data: { data: [], totals: {} } })

    const store = useMappingStore()

    await store.fetchBuildings()

    expect(store.isLoading).toBe(false)
    expect(store.isLoadingVisible).toBe(false)
  })

  it('shows the overlay when the fetch takes longer than the show-delay', async () => {
    vi.useFakeTimers()
    let resolveFetch: (v: any) => void = () => {}

    vi.mocked(getMappingBuildings).mockImplementation(
      () => new Promise(resolve => { resolveFetch = resolve }),
    )

    const store = useMappingStore()
    const pending = store.fetchBuildings()

    await vi.advanceTimersByTimeAsync(200)
    expect(store.isLoadingVisible).toBe(true)

    resolveFetch({ data: { data: [], totals: {} } })
    await pending

    // Still visible: minimum-visible window not yet elapsed.
    expect(store.isLoadingVisible).toBe(true)

    await vi.advanceTimersByTimeAsync(400)
    expect(store.isLoadingVisible).toBe(false)
  })
})

describe('useMappingStore.setPolygon', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    __resetLoadingSmoothingForTests()
    vi.mocked(getMappingBuildings).mockResolvedValue({ data: { data: [], totals: {} } })
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('sends the current polygon in the fetch request', async () => {
    const store = useMappingStore()

    await store.setPolygon(POLYGON_A)

    expect(getMappingBuildings).toHaveBeenLastCalledWith(
      expect.objectContaining({ polygon: POLYGON_A }),
      expect.any(Object),
      null,
    )
  })

  it('replaces polygon A with polygon B on successive calls', async () => {
    const store = useMappingStore()

    await store.setPolygon(POLYGON_A)
    await store.setPolygon(POLYGON_B)

    expect(store.filters.polygon).toEqual(POLYGON_B)
    expect(getMappingBuildings).toHaveBeenLastCalledWith(
      expect.objectContaining({ polygon: POLYGON_B }),
      expect.any(Object),
      null,
    )
  })

  it('clears the polygon filter when passed null', async () => {
    const store = useMappingStore()

    await store.setPolygon(POLYGON_A)
    await store.setPolygon(null)

    expect(store.filters.polygon).toBeUndefined()
  })
})
