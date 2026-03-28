import { defineStore } from 'pinia'
import {
  getSalesPackages,
  getSalesPackageById,
  createSalesPackage,
  updateSalesPackage,
  deleteSalesPackage,
  importSalesPackages,
  exportSalesPackages,
} from '@/http/salespackage'
import type { SalesPackage, CreateSalesPackageRequest, UpdateSalesPackageRequest } from '@/types/salespackage'
import type { PaginationParams } from '@/types/api'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'

interface SalesPackageState {
  packages: SalesPackage[]
  currentPackage: SalesPackage | null
  isLoading: boolean
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const useSalesPackageStore = defineStore('salespackage', {
  state: (): SalesPackageState => ({
    packages: [],
    currentPackage: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  actions: {
    async fetchSalesPackages(params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getSalesPackages(params)
        this.packages = response.data || []
        if (response.extras) {
          const take = response.extras.take || 10
          const skip = response.extras.skip || 0
          const total = response.extras.total || 0
          this.pagination = {
            currentPage: Math.floor(skip / take) + 1,
            lastPage: Math.ceil(total / take) || 1,
            perPage: take,
            total,
          }
        } else {
          this.pagination.total = response.data?.length || 0
          this.pagination.currentPage = params?.skip
            ? Math.floor((params.skip / (params.take || 10)) + 1)
            : 1
          this.pagination.perPage = params?.take || 10
          this.pagination.lastPage = Math.ceil(this.pagination.total / this.pagination.perPage) || 1
        }
        return response
      }
      catch (error) {
        console.error('Error fetching sales packages:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchSalesPackageById(id: number) {
      this.isLoading = true
      try {
        const response = await getSalesPackageById(id)
        this.currentPackage = response.data || null
        return response
      }
      catch (error) {
        console.error('Error fetching sales package:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async createSalesPackage(data: CreateSalesPackageRequest) {
      this.isLoading = true
      try {
        const response = await createSalesPackage(data)
        if (response.data) {
          this.packages.push(response.data)
        }
        return response
      }
      catch (error) {
        console.error('Error creating sales package:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async updateSalesPackage(id: number, data: UpdateSalesPackageRequest) {
      this.isLoading = true
      try {
        const response = await updateSalesPackage(id, data)
        if (response.data) {
          const index = this.packages.findIndex(p => p.id === id)
          if (index !== -1) {
            this.packages[index] = response.data
          }
          if (this.currentPackage?.id === id) {
            this.currentPackage = response.data
          }
        }
        return response
      }
      catch (error) {
        console.error('Error updating sales package:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteSalesPackage(id: number) {
      this.isLoading = true
      try {
        await deleteSalesPackage(id)
        this.packages = this.packages.filter(p => p.id !== id)
        if (this.currentPackage?.id === id) {
          this.currentPackage = null
        }
      }
      catch (error) {
        console.error('Error deleting sales package:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async importSalesPackages(file: File) {
      this.isLoading = true
      try {
        const response = await importSalesPackages(file)
        return response
      }
      catch (error) {
        console.error('Error importing sales packages:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async exportSalesPackages(search?: string) {
      try {
        const blob = await exportSalesPackages(search)
        const filename = `SalesPackage_Export_${dayjs().format('DD-MM-YYYY')}.xlsx`
        saveAs(blob, filename)
      }
      catch (error) {
        console.error('Error exporting sales packages:', error)
        throw error
      }
    },

    clearCurrentPackage() {
      this.currentPackage = null
    },
  },
})
