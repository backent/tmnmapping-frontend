import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRateCardStore } from '@/stores/ratecard'
import type { RateCardVersion } from '@/types/ratecard'
import { formatIdr } from '@/types/ratecard'
import type { ImportResult } from '@/types/advertiser'

import {
  getCurrentRateCard,
  getRateCardVersions,
  importBuildingPrices,
  publishRateCardVersion,
} from '@/http/ratecard'

vi.mock('@/http/ratecard', () => ({
  getRateCardVersions: vi.fn(),
  getRateCardVersionById: vi.fn(),
  getCurrentRateCard: vi.fn(),
  createRateCardVersion: vi.fn(),
  updateRateCardVersion: vi.fn(),
  deleteRateCardVersion: vi.fn(),
  publishRateCardVersion: vi.fn(),
  getBuildingPrices: vi.fn(),
  upsertBuildingPrice: vi.fn(),
  deleteBuildingPrice: vi.fn(),
  importBuildingPrices: vi.fn(),
  exportBuildingPrices: vi.fn(),
  downloadBuildingPriceTemplate: vi.fn(),
  getPackagePrices: vi.fn(),
  upsertPackagePrice: vi.fn(),
  deletePackagePrice: vi.fn(),
  importPackagePrices: vi.fn(),
  exportPackagePrices: vi.fn(),
  downloadPackagePriceTemplate: vi.fn(),
}))

vi.mock('file-saver', () => ({ saveAs: vi.fn() }))

const draft: RateCardVersion = {
  id: 1,
  version_code: 'RC-2027',
  description: '',
  currency: 'IDR',
  status: 'draft',
  is_editable: true,
  published_by_user_id: 0,
  published_by_name: '',
  published_at: '',
  building_price_count: 3,
  package_price_count: 1,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

const published: RateCardVersion = {
  ...draft,
  status: 'current',
  is_editable: false,
  published_at: '2026-09-07T00:00:00Z',
  published_by_name: 'Admin User',
}

describe('useRateCardStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('isSelectedEditable', () => {
    it('follows the server flag rather than re-deriving it from status', () => {
      const store = useRateCardStore()

      store.selectedVersion = draft
      expect(store.isSelectedEditable).toBe(true)

      store.selectedVersion = published
      expect(store.isSelectedEditable).toBe(false)
    })

    it('is false when nothing is selected', () => {
      expect(useRateCardStore().isSelectedEditable).toBe(false)
    })
  })

  describe('fetchCurrentVersion', () => {
    it('stores the published rate card', async () => {
      vi.mocked(getCurrentRateCard).mockResolvedValue({ data: published } as any)

      const store = useRateCardStore()

      expect(await store.fetchCurrentVersion()).toEqual(published)
    })

    // Before the first publish the endpoint 404s, which is a normal state and must
    // not surface as an error on screen.
    it('treats "nothing published yet" as null rather than an error', async () => {
      vi.mocked(getCurrentRateCard).mockRejectedValue({ status: 404 })

      const store = useRateCardStore()

      expect(await store.fetchCurrentVersion()).toBeNull()
      expect(store.currentVersion).toBeNull()
    })
  })

  describe('publishVersion', () => {
    it('refreshes both the selection and the cached current version', async () => {
      vi.mocked(publishRateCardVersion).mockResolvedValue({ data: published } as any)

      const store = useRateCardStore()

      store.selectedVersion = draft
      await store.publishVersion(1)

      expect(store.selectedVersion?.status).toBe('current')
      expect(store.currentVersion?.id).toBe(1)
      expect(store.isLoading).toBe(false)
    })

    it('clears the loading flag when publishing is refused', async () => {
      vi.mocked(publishRateCardVersion).mockRejectedValue({
        status: 400,
        details: { data: 'this rate card has no prices; add some before publishing' },
      })

      const store = useRateCardStore()

      await expect(store.publishVersion(1)).rejects.toBeDefined()
      expect(store.isLoading).toBe(false)
    })
  })

  describe('importPrices', () => {
    it('surfaces per-row errors from a rejected upload instead of throwing', async () => {
      const rejected: ImportResult = {
        rows: 1,
        created: 0,
        updated: 0,
        imported: false,
        errors: [{
          row: 2,
          column: 'Price per 4 Weeks (IDR)',
          value: '92000000.55',
          message: 'Price must be a whole number of rupiah',
        }],
      }

      vi.mocked(importBuildingPrices).mockRejectedValue({ status: 400, details: { data: rejected } })

      const store = useRateCardStore()
      const returned = await store.importPrices(1, new File([''], 'prices.xlsx'), 'building')

      expect(returned).toEqual(rejected)
      expect(store.lastImport?.errors[0].row).toBe(2)
      expect(store.isFileBusy).toBe(false)
    })

    it('rethrows a failure carrying no import result', async () => {
      vi.mocked(importBuildingPrices).mockRejectedValue({ status: 500, details: {} })

      const store = useRateCardStore()

      await expect(store.importPrices(1, new File([''], 'x.xlsx'), 'building')).rejects.toBeDefined()
      expect(store.isFileBusy).toBe(false)
    })
  })

  describe('fetchVersions', () => {
    it('derives pagination from extras', async () => {
      vi.mocked(getRateCardVersions).mockResolvedValue({
        data: [draft],
        extras: { take: 10, skip: 10, total: 25 },
      } as any)

      const store = useRateCardStore()

      await store.fetchVersions({ take: 10, skip: 10 })

      expect(store.versionPagination).toEqual({
        currentPage: 2, lastPage: 3, perPage: 10, total: 25,
      })
    })
  })

  describe('clearSelection', () => {
    it('drops the version and both price lists', () => {
      const store = useRateCardStore()

      store.selectedVersion = draft
      store.buildingPrices = [{ id: 1 } as any]
      store.packagePrices = [{ id: 2 } as any]

      store.clearSelection()

      expect(store.selectedVersion).toBeNull()
      expect(store.buildingPrices).toEqual([])
      expect(store.packagePrices).toEqual([])
    })
  })
})

describe('formatIdr', () => {
  // Rupiah has no minor unit, so a price must never render with decimals.
  it('renders whole rupiah', () => {
    const formatted = formatIdr(92000000)

    expect(formatted).toContain('92')
    expect(formatted).not.toMatch(/[.,]\d{2}$/)
  })

  it('handles zero', () => {
    expect(formatIdr(0)).toContain('0')
  })
})
