/**
 * Advertiser master data stores.
 *
 * One factory builds all three, because customers, brands and sales assignments
 * differ only in their HTTP calls — the list, pagination and file handling are
 * identical, and keeping three hand-written copies in step is how they drift.
 */

import { defineStore } from 'pinia'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { ImportResult } from '@/types/advertiser'
import {
  createBrand,
  createCustomer,
  createSalesAssignment,
  deleteBrand,
  deleteCustomer,
  deleteSalesAssignment,
  downloadBrandTemplate,
  downloadCustomerTemplate,
  downloadSalesAssignmentTemplate,
  exportBrands,
  exportCustomers,
  exportSalesAssignments,
  getBrandById,
  getBrands,
  getCustomerById,
  getCustomers,
  getSalesAssignmentById,
  getSalesAssignments,
  importBrands,
  importCustomers,
  importSalesAssignments,
  updateBrand,
  updateCustomer,
  updateSalesAssignment,
} from '@/http/advertiser'

interface Entity { id: number }

interface Api<T, P> {
  list: (params?: any) => Promise<ApiResponse<T[]>>
  byId: (id: number) => Promise<ApiResponse<T>>
  create: (data: P) => Promise<ApiResponse<T>>
  update: (id: number, data: P) => Promise<ApiResponse<T>>
  remove: (id: number) => Promise<ApiResponse<string>>
  upload: (file: File) => Promise<ApiResponse<ImportResult>>
  download: (search?: string) => Promise<Blob>
  template: () => Promise<Blob>
}

interface State<T> {
  items: T[]
  currentItem: T | null
  isLoading: boolean
  isFileBusy: boolean
  lastImport: ImportResult | null
  pagination: { currentPage: number; lastPage: number; perPage: number; total: number }
}

function createAdvertiserStore<T extends Entity, P>(id: string, api: Api<T, P>, fileLabel: string) {
  return defineStore(id, {
    state: (): State<T> => ({
      items: [],
      currentItem: null,
      isLoading: false,
      isFileBusy: false,
      lastImport: null,
      pagination: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
    }),

    actions: {
      async fetchList(params?: PaginationParams & Record<string, any>) {
        this.isLoading = true
        try {
          const response = await api.list(params)

          this.items = (response.data || []) as any

          const take = response.extras?.take || params?.take || 10
          const skip = response.extras?.skip ?? params?.skip ?? 0
          const total = response.extras?.total ?? response.data?.length ?? 0

          this.pagination = {
            currentPage: Math.floor(skip / take) + 1,
            lastPage: Math.ceil(total / take) || 1,
            perPage: take,
            total,
          }

          return response
        }
        finally {
          this.isLoading = false
        }
      },

      async fetchById(itemId: number) {
        this.isLoading = true
        try {
          const response = await api.byId(itemId)

          this.currentItem = (response.data || null) as any

          return response
        }
        finally {
          this.isLoading = false
        }
      },

      async create(data: P) {
        this.isLoading = true
        try {
          return await api.create(data)
        }
        finally {
          this.isLoading = false
        }
      },

      async update(itemId: number, data: P) {
        this.isLoading = true
        try {
          const response = await api.update(itemId, data)

          if (response.data) {
            const index = this.items.findIndex((item: any) => item.id === itemId)
            if (index !== -1)
              this.items[index] = response.data as any
          }

          return response
        }
        finally {
          this.isLoading = false
        }
      },

      async deleteItem(itemId: number) {
        this.isLoading = true
        try {
          await api.remove(itemId)
          this.items = this.items.filter((item: any) => item.id !== itemId) as any
          if ((this.currentItem as any)?.id === itemId)
            this.currentItem = null
        }
        finally {
          this.isLoading = false
        }
      },

      /**
       * Upload a filled template.
       *
       * A rejected import comes back as a 400 whose body still carries the per-row
       * errors, so the failure path has to read `error.details.data` rather than
       * just surfacing "request failed".
       */
      async importFile(file: File) {
        this.isFileBusy = true
        this.lastImport = null
        try {
          const response = await api.upload(file)

          this.lastImport = response.data || null

          return this.lastImport
        }
        catch (error: any) {
          const rejected = error?.details?.data as ImportResult | undefined
          if (rejected?.errors) {
            this.lastImport = rejected

            return rejected
          }

          throw error
        }
        finally {
          this.isFileBusy = false
        }
      },

      async exportFile(search?: string) {
        this.isFileBusy = true
        try {
          saveAs(await api.download(search), `${fileLabel}_Export_${dayjs().format('DD-MM-YYYY')}.xlsx`)
        }
        finally {
          this.isFileBusy = false
        }
      },

      async downloadTemplate() {
        this.isFileBusy = true
        try {
          saveAs(await api.template(), `${fileLabel}_Template.xlsx`)
        }
        finally {
          this.isFileBusy = false
        }
      },

      clearCurrentItem() {
        this.currentItem = null
      },

      clearImportResult() {
        this.lastImport = null
      },
    },
  })
}

export const useCustomerStore = createAdvertiserStore('customer', {
  list: getCustomers,
  byId: getCustomerById,
  create: createCustomer,
  update: updateCustomer,
  remove: deleteCustomer,
  upload: importCustomers,
  download: exportCustomers,
  template: downloadCustomerTemplate,
}, 'Customers')

export const useAdvertiserBrandStore = createAdvertiserStore('advertiserBrand', {
  list: getBrands,
  byId: getBrandById,
  create: createBrand,
  update: updateBrand,
  remove: deleteBrand,
  upload: importBrands,
  download: exportBrands,
  template: downloadBrandTemplate,
}, 'Brands')

export const useSalesAssignmentStore = createAdvertiserStore('salesAssignment', {
  list: getSalesAssignments,
  byId: getSalesAssignmentById,
  create: createSalesAssignment,
  update: updateSalesAssignment,
  remove: deleteSalesAssignment,
  upload: importSalesAssignments,
  download: exportSalesAssignments,
  template: downloadSalesAssignmentTemplate,
}, 'Sales_Assignments')
