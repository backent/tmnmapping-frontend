import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCustomerStore, useSalesAssignmentStore } from '@/stores/advertiser'
import type { Customer, ImportResult } from '@/types/advertiser'

import {
  deleteCustomer,
  downloadCustomerTemplate,
  exportCustomers,
  getCustomers,
  importCustomers,
  updateCustomer,
} from '@/http/advertiser'

vi.mock('@/http/advertiser', () => ({
  getCustomers: vi.fn(),
  getCustomerById: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  importCustomers: vi.fn(),
  exportCustomers: vi.fn(),
  downloadCustomerTemplate: vi.fn(),
  getBrands: vi.fn(),
  getBrandById: vi.fn(),
  createBrand: vi.fn(),
  updateBrand: vi.fn(),
  deleteBrand: vi.fn(),
  importBrands: vi.fn(),
  exportBrands: vi.fn(),
  downloadBrandTemplate: vi.fn(),
  getSalesAssignments: vi.fn(),
  getSalesAssignmentById: vi.fn(),
  createSalesAssignment: vi.fn(),
  updateSalesAssignment: vi.fn(),
  deleteSalesAssignment: vi.fn(),
  importSalesAssignments: vi.fn(),
  exportSalesAssignments: vi.fn(),
  downloadSalesAssignmentTemplate: vi.fn(),
}))

const saveAs = vi.fn()

vi.mock('file-saver', () => ({ saveAs: (...args: any[]) => saveAs(...args) }))

const acme: Customer = {
  id: 1,
  code: 'CUST-001',
  name: 'Acme',
  industry: 'Retail',
  status: 'active',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

describe('advertiser stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('fetchList', () => {
    it('derives pagination from extras', async () => {
      vi.mocked(getCustomers).mockResolvedValue({
        data: [acme],
        extras: { take: 10, skip: 20, total: 42 },
      } as any)

      const store = useCustomerStore()

      await store.fetchList({ take: 10, skip: 20 })

      expect(store.items).toHaveLength(1)
      expect(store.pagination).toEqual({ currentPage: 3, lastPage: 5, perPage: 10, total: 42 })
    })

    it('clears the loading flag when the request fails', async () => {
      vi.mocked(getCustomers).mockRejectedValue(new Error('boom'))

      const store = useCustomerStore()

      await expect(store.fetchList()).rejects.toThrow('boom')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('importFile', () => {
    it('stores the result of a successful import', async () => {
      const result: ImportResult = { rows: 2, created: 1, updated: 1, imported: true, errors: [] }

      vi.mocked(importCustomers).mockResolvedValue({ data: result } as any)

      const store = useCustomerStore()
      const returned = await store.importFile(new File([''], 'customers.xlsx'))

      expect(returned).toEqual(result)
      expect(store.lastImport).toEqual(result)
      expect(store.isFileBusy).toBe(false)
    })

    // A rejected import comes back as a 400 whose body still carries the per-row
    // errors. Without unwrapping it the operator would only see "request failed".
    it('surfaces per-row errors from a rejected import instead of throwing', async () => {
      const rejected: ImportResult = {
        rows: 2,
        created: 0,
        updated: 0,
        imported: false,
        errors: [{ row: 3, column: 'Customer Code', value: '', message: 'Customer Code is required' }],
      }

      vi.mocked(importCustomers).mockRejectedValue({ status: 400, details: { data: rejected } })

      const store = useCustomerStore()
      const returned = await store.importFile(new File([''], 'customers.xlsx'))

      expect(returned).toEqual(rejected)
      expect(store.lastImport?.errors[0].row).toBe(3)
      expect(store.isFileBusy).toBe(false)
    })

    it('rethrows a failure that carries no import result', async () => {
      vi.mocked(importCustomers).mockRejectedValue({ status: 500, details: {} })

      const store = useCustomerStore()

      await expect(store.importFile(new File([''], 'x.xlsx'))).rejects.toBeDefined()
      expect(store.isFileBusy).toBe(false)
    })

    it('clears any previous result before uploading', async () => {
      vi.mocked(importCustomers).mockResolvedValue({
        data: { rows: 1, created: 1, updated: 0, imported: true, errors: [] },
      } as any)

      const store = useCustomerStore()

      store.lastImport = { rows: 9, created: 0, updated: 0, imported: false, errors: [] }
      await store.importFile(new File([''], 'customers.xlsx'))

      expect(store.lastImport?.rows).toBe(1)
    })
  })

  describe('file downloads', () => {
    it('names the template after the entity', async () => {
      vi.mocked(downloadCustomerTemplate).mockResolvedValue(new Blob(['x']))

      await useCustomerStore().downloadTemplate()

      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), 'Customers_Template.xlsx')
    })

    it('date-stamps the export', async () => {
      vi.mocked(exportCustomers).mockResolvedValue(new Blob(['x']))

      await useCustomerStore().exportFile('acme')

      expect(exportCustomers).toHaveBeenCalledWith('acme')
      expect(saveAs).toHaveBeenCalledWith(expect.any(Blob), expect.stringMatching(/^Customers_Export_\d{2}-\d{2}-\d{4}\.xlsx$/))
    })
  })

  describe('mutations', () => {
    it('replaces the updated item in the list', async () => {
      vi.mocked(updateCustomer).mockResolvedValue({ data: { ...acme, name: 'Renamed' } } as any)

      const store = useCustomerStore()

      store.items = [acme]
      await store.update(1, { code: 'CUST-001', name: 'Renamed', industry: 'Retail', status: 'active' })

      expect(store.items[0].name).toBe('Renamed')
    })

    it('removes a deleted item', async () => {
      vi.mocked(deleteCustomer).mockResolvedValue({ data: 'ok' } as any)

      const store = useCustomerStore()

      store.items = [acme]
      await store.deleteItem(1)

      expect(store.items).toEqual([])
    })
  })

  // The factory builds three stores; they must not share state.
  it('keeps each entity store independent', async () => {
    const customers = useCustomerStore()
    const assignments = useSalesAssignmentStore()

    customers.items = [acme]

    expect(assignments.items).toEqual([])
  })
})
