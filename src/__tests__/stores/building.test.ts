import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useBuildingStore } from '@/stores/building'
import type { Building } from '@/types/building'

import { getBuildings } from '@/http/building'

// ---------------------------------------------------------------------------
// Mock the HTTP layer so no real network calls are made
// ---------------------------------------------------------------------------

vi.mock('@/http/building', () => ({
  getBuildings: vi.fn(),
  getBuildingById: vi.fn(),
  putBuilding: vi.fn(),
  syncBuildings: vi.fn(),
  getFilterOptions: vi.fn(),
  getBuildingDropdownOptions: vi.fn(),
}))

function makeBuilding(id: number, name: string): Building {
  return {
    id,
    external_building_id: `ext-${id}`,
    iris_code: `iris-${id}`,
    name,
    project_name: `${name} Project`,
    audience: 0,
    impression: 0,
    cbd_area: '',
    building_status: 'active',
    competitor_location: false,
    sellable: '',
    connectivity: '',
    resource_type: '',
    subdistrict: 'Menteng',
    citytown: 'Jakarta Pusat',
    province: 'DKI Jakarta',
    grade_resource: '',
    building_type: 'Office',
    completion_year: 2020,
    images: [],
    synced_at: '',
    created_at: '',
    updated_at: '',
  }
}

describe('useBuildingStore.fetchBuildingsForPicker', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('writes results to pickerBuildings, not buildings', async () => {
    const pickerRows = [makeBuilding(1, 'Tower A'), makeBuilding(2, 'Tower B')]

    vi.mocked(getBuildings).mockResolvedValue({
      data: pickerRows,
      extras: { take: 10, skip: 0, total: 2 },
    })

    const store = useBuildingStore()

    // Seed the main list to verify the picker does not overwrite it
    store.buildings = [makeBuilding(99, 'Existing')]

    await store.fetchBuildingsForPicker({ take: 10, skip: 0 })

    expect(store.pickerBuildings).toEqual(pickerRows)
    expect(store.buildings).toEqual([makeBuilding(99, 'Existing')])
  })

  it('derives pickerPagination from extras', async () => {
    vi.mocked(getBuildings).mockResolvedValue({
      data: [],
      extras: { take: 25, skip: 50, total: 123 },
    })

    const store = useBuildingStore()

    await store.fetchBuildingsForPicker({ take: 25, skip: 50 })

    expect(store.pickerPagination).toEqual({
      currentPage: 3, // skip 50 / take 25 => page index 2, +1
      lastPage: 5, // ceil(123/25)
      perPage: 25,
      total: 123,
    })
  })

  it('falls back to the requested params when extras are missing', async () => {
    vi.mocked(getBuildings).mockResolvedValue({ data: [makeBuilding(7, 'Solo')] })

    const store = useBuildingStore()

    await store.fetchBuildingsForPicker({ take: 10, skip: 0 })

    expect(store.pickerPagination.perPage).toBe(10)
    expect(store.pickerPagination.total).toBe(1)
  })

  it('toggles pickerIsLoading around the call', async () => {
    let resolveFn: ((value: any) => void) | null = null
    vi.mocked(getBuildings).mockReturnValue(
      new Promise(resolve => { resolveFn = resolve }),
    )

    const store = useBuildingStore()
    const pending = store.fetchBuildingsForPicker({ take: 10, skip: 0 })

    expect(store.pickerIsLoading).toBe(true)

    resolveFn!({ data: [], extras: { take: 10, skip: 0, total: 0 } })
    await pending

    expect(store.pickerIsLoading).toBe(false)
  })

  it('resets pickerIsLoading and re-throws on failure', async () => {
    vi.mocked(getBuildings).mockRejectedValue(new Error('boom'))

    const store = useBuildingStore()

    await expect(store.fetchBuildingsForPicker({ take: 10, skip: 0 }))
      .rejects.toThrow('boom')

    expect(store.pickerIsLoading).toBe(false)
  })

  it('forwards search and pagination params to getBuildings', async () => {
    vi.mocked(getBuildings).mockResolvedValue({
      data: [],
      extras: { take: 10, skip: 0, total: 0 },
    })

    const store = useBuildingStore()

    await store.fetchBuildingsForPicker({ take: 10, skip: 0, search: 'tower' })

    expect(getBuildings).toHaveBeenCalledWith({ take: 10, skip: 0, search: 'tower' })
  })
})
