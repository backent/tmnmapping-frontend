import { defineStore } from 'pinia'
import {
  getMotherBrands,
  getMotherBrandById,
  createMotherBrand,
  updateMotherBrand,
  deleteMotherBrand,
  getMotherBrandsDropdown,
  importMotherBrands,
  exportMotherBrands,
} from '@/http/motherbrand'
import type { MotherBrand, CreateMotherBrandRequest, UpdateMotherBrandRequest } from '@/types/motherbrand'
import type { PaginationParams } from '@/types/api'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'

interface MotherBrandState {
  items: MotherBrand[]
  currentItem: MotherBrand | null
  dropdownItems: MotherBrand[]
  isLoading: boolean
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const useMotherBrandStore = defineStore('motherbrand', {
  state: (): MotherBrandState => ({
    items: [],
    currentItem: null,
    dropdownItems: [],
    isLoading: false,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  actions: {
    async fetchList(params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getMotherBrands(params)
        this.items = response.data || []
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
        }
        else {
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
        console.error('Error fetching mother brands:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchById(id: number) {
      this.isLoading = true
      try {
        const response = await getMotherBrandById(id)
        this.currentItem = response.data || null
        return response
      }
      catch (error) {
        console.error('Error fetching mother brand:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async create(data: CreateMotherBrandRequest) {
      this.isLoading = true
      try {
        const response = await createMotherBrand(data)
        if (response.data) {
          this.items.push(response.data)
        }
        return response
      }
      catch (error) {
        console.error('Error creating mother brand:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async update(id: number, data: UpdateMotherBrandRequest) {
      this.isLoading = true
      try {
        const response = await updateMotherBrand(id, data)
        if (response.data) {
          const index = this.items.findIndex(item => item.id === id)
          if (index !== -1) {
            this.items[index] = response.data
          }
          if (this.currentItem?.id === id) {
            this.currentItem = response.data
          }
        }
        return response
      }
      catch (error) {
        console.error('Error updating mother brand:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteItem(id: number) {
      this.isLoading = true
      try {
        await deleteMotherBrand(id)
        this.items = this.items.filter(item => item.id !== id)
        if (this.currentItem?.id === id) {
          this.currentItem = null
        }
      }
      catch (error) {
        console.error('Error deleting mother brand:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchDropdown() {
      try {
        const response = await getMotherBrandsDropdown()
        this.dropdownItems = response.data || []
        return response
      }
      catch (error) {
        console.error('Error fetching mother brands dropdown:', error)
        throw error
      }
    },

    async importFile(file: File) {
      this.isLoading = true
      try {
        const response = await importMotherBrands(file)
        return response
      }
      catch (error) {
        console.error('Error importing mother brands:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async exportFile(search?: string) {
      try {
        const blob = await exportMotherBrands(search)
        const filename = `MotherBrand_Export_${dayjs().format('DD-MM-YYYY')}.xlsx`
        saveAs(blob, filename)
      }
      catch (error) {
        console.error('Error exporting mother brands:', error)
        throw error
      }
    },

    clearCurrentItem() {
      this.currentItem = null
    },
  },
})
