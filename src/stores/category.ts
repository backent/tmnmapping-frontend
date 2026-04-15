import { defineStore } from 'pinia'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'
import {
  createCategory,
  deleteCategory,
  exportCategories,
  getCategories,
  getCategoriesDropdown,
  getCategoryById,
  importCategories,
  updateCategory,
} from '@/http/category'
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/category'
import type { PaginationParams } from '@/types/api'

interface CategoryState {
  items: Category[]
  currentItem: Category | null
  dropdownItems: Category[]
  isLoading: boolean
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const useCategoryStore = defineStore('category', {
  state: (): CategoryState => ({
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
        const response = await getCategories(params)

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
        console.error('Error fetching categories:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchById(id: number) {
      this.isLoading = true
      try {
        const response = await getCategoryById(id)

        this.currentItem = response.data || null

        return response
      }
      catch (error) {
        console.error('Error fetching category:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async create(data: CreateCategoryRequest) {
      this.isLoading = true
      try {
        const response = await createCategory(data)
        if (response.data)
          this.items.push(response.data)

        return response
      }
      catch (error) {
        console.error('Error creating category:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async update(id: number, data: UpdateCategoryRequest) {
      this.isLoading = true
      try {
        const response = await updateCategory(id, data)
        if (response.data) {
          const index = this.items.findIndex(item => item.id === id)
          if (index !== -1)
            this.items[index] = response.data

          if (this.currentItem?.id === id)
            this.currentItem = response.data
        }

        return response
      }
      catch (error) {
        console.error('Error updating category:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteItem(id: number) {
      this.isLoading = true
      try {
        await deleteCategory(id)
        this.items = this.items.filter(item => item.id !== id)
        if (this.currentItem?.id === id)
          this.currentItem = null
      }
      catch (error) {
        console.error('Error deleting category:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchDropdown() {
      try {
        const response = await getCategoriesDropdown()

        this.dropdownItems = response.data || []

        return response
      }
      catch (error) {
        console.error('Error fetching categories dropdown:', error)
        throw error
      }
    },

    async importFile(file: File) {
      this.isLoading = true
      try {
        return await importCategories(file)
      }
      catch (error) {
        console.error('Error importing categories:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async exportFile(search?: string) {
      try {
        const blob = await exportCategories(search)
        const filename = `Category_Export_${dayjs().format('DD-MM-YYYY')}.xlsx`

        saveAs(blob, filename)
      }
      catch (error) {
        console.error('Error exporting categories:', error)
        throw error
      }
    },

    clearCurrentItem() {
      this.currentItem = null
    },
  },
})
