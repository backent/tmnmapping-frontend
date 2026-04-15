import { defineStore } from 'pinia'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'
import {
  createBuildingRestriction,
  deleteBuildingRestriction,
  exportBuildingRestrictions,
  getBuildingRestrictionById,
  getBuildingRestrictions,
  importBuildingRestrictions,
  updateBuildingRestriction,
} from '@/http/buildingrestriction'
import type { BuildingRestriction, CreateBuildingRestrictionRequest, UpdateBuildingRestrictionRequest } from '@/types/buildingrestriction'
import type { PaginationParams } from '@/types/api'

interface BuildingRestrictionState {
  restrictions: BuildingRestriction[]
  currentRestriction: BuildingRestriction | null
  isLoading: boolean
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const useBuildingRestrictionStore = defineStore('buildingrestriction', {
  state: (): BuildingRestrictionState => ({
    restrictions: [],
    currentRestriction: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  actions: {
    async fetchBuildingRestrictions(params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getBuildingRestrictions(params)

        this.restrictions = response.data || []
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
        console.error('Error fetching building restrictions:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchBuildingRestrictionById(id: number) {
      this.isLoading = true
      try {
        const response = await getBuildingRestrictionById(id)

        this.currentRestriction = response.data || null

        return response
      }
      catch (error) {
        console.error('Error fetching building restriction:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async createBuildingRestriction(data: CreateBuildingRestrictionRequest) {
      this.isLoading = true
      try {
        const response = await createBuildingRestriction(data)
        if (response.data)
          this.restrictions.push(response.data)

        return response
      }
      catch (error) {
        console.error('Error creating building restriction:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async updateBuildingRestriction(id: number, data: UpdateBuildingRestrictionRequest) {
      this.isLoading = true
      try {
        const response = await updateBuildingRestriction(id, data)
        if (response.data) {
          const index = this.restrictions.findIndex(r => r.id === id)
          if (index !== -1)
            this.restrictions[index] = response.data

          if (this.currentRestriction?.id === id)
            this.currentRestriction = response.data
        }

        return response
      }
      catch (error) {
        console.error('Error updating building restriction:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteBuildingRestriction(id: number) {
      this.isLoading = true
      try {
        await deleteBuildingRestriction(id)
        this.restrictions = this.restrictions.filter(r => r.id !== id)
        if (this.currentRestriction?.id === id)
          this.currentRestriction = null
      }
      catch (error) {
        console.error('Error deleting building restriction:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async importBuildingRestrictions(file: File) {
      this.isLoading = true
      try {
        return await importBuildingRestrictions(file)
      }
      catch (error) {
        console.error('Error importing building restrictions:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async exportBuildingRestrictions(search?: string) {
      try {
        const blob = await exportBuildingRestrictions(search)
        const filename = `BuildingRestriction_Export_${dayjs().format('DD-MM-YYYY')}.xlsx`

        saveAs(blob, filename)
      }
      catch (error) {
        console.error('Error exporting building restrictions:', error)
        throw error
      }
    },

    clearCurrentRestriction() {
      this.currentRestriction = null
    },
  },
})
