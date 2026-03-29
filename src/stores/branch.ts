import { defineStore } from 'pinia'
import {
  getBranches,
  getBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
  getBranchesDropdown,
  importBranches,
  exportBranches,
} from '@/http/branch'
import type { Branch, CreateBranchRequest, UpdateBranchRequest } from '@/types/branch'
import type { PaginationParams } from '@/types/api'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'

interface BranchState {
  items: Branch[]
  currentItem: Branch | null
  dropdownItems: Branch[]
  isLoading: boolean
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const useBranchStore = defineStore('branch', {
  state: (): BranchState => ({
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
        const response = await getBranches(params)
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
        console.error('Error fetching branches:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchById(id: number) {
      this.isLoading = true
      try {
        const response = await getBranchById(id)
        this.currentItem = response.data || null
        return response
      }
      catch (error) {
        console.error('Error fetching branch:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async create(data: CreateBranchRequest) {
      this.isLoading = true
      try {
        const response = await createBranch(data)
        if (response.data) {
          this.items.push(response.data)
        }
        return response
      }
      catch (error) {
        console.error('Error creating branch:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async update(id: number, data: UpdateBranchRequest) {
      this.isLoading = true
      try {
        const response = await updateBranch(id, data)
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
        console.error('Error updating branch:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteItem(id: number) {
      this.isLoading = true
      try {
        await deleteBranch(id)
        this.items = this.items.filter(item => item.id !== id)
        if (this.currentItem?.id === id) {
          this.currentItem = null
        }
      }
      catch (error) {
        console.error('Error deleting branch:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchDropdown() {
      try {
        const response = await getBranchesDropdown()
        this.dropdownItems = response.data || []
        return response
      }
      catch (error) {
        console.error('Error fetching branches dropdown:', error)
        throw error
      }
    },

    async importFile(file: File) {
      this.isLoading = true
      try {
        const response = await importBranches(file)
        return response
      }
      catch (error) {
        console.error('Error importing branches:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async exportFile(search?: string) {
      try {
        const blob = await exportBranches(search)
        const filename = `Branch_Export_${dayjs().format('DD-MM-YYYY')}.xlsx`
        saveAs(blob, filename)
      }
      catch (error) {
        console.error('Error exporting branches:', error)
        throw error
      }
    },

    clearCurrentItem() {
      this.currentItem = null
    },
  },
})
