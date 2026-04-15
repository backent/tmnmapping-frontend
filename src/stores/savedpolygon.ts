import { defineStore } from 'pinia'
import {
  createSavedPolygon,
  deleteSavedPolygon,
  getSavedPolygonById,
  getSavedPolygons,
  updateSavedPolygon,
} from '@/http/savedpolygon'
import type { CreateSavedPolygonRequest, SavedPolygon, UpdateSavedPolygonRequest } from '@/types/savedpolygon'
import type { PaginationParams } from '@/types/api'

interface SavedPolygonState {
  savedPolygons: SavedPolygon[]
  currentSavedPolygon: SavedPolygon | null
  isLoading: boolean
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const useSavedPolygonStore = defineStore('savedpolygon', {
  state: (): SavedPolygonState => ({
    savedPolygons: [],
    currentSavedPolygon: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  actions: {
    async fetchSavedPolygons(params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getSavedPolygons(params)

        this.savedPolygons = response.data || []
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
        console.error('Error fetching saved polygons:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchSavedPolygonById(id: number) {
      this.isLoading = true
      try {
        const response = await getSavedPolygonById(id)

        this.currentSavedPolygon = response.data || null

        return response
      }
      catch (error) {
        console.error('Error fetching saved polygon:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async createSavedPolygon(data: CreateSavedPolygonRequest) {
      this.isLoading = true
      try {
        const response = await createSavedPolygon(data)
        if (response.data)
          this.savedPolygons.push(response.data)

        return response
      }
      catch (error) {
        console.error('Error creating saved polygon:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async updateSavedPolygon(id: number, data: UpdateSavedPolygonRequest) {
      this.isLoading = true
      try {
        const response = await updateSavedPolygon(id, data)
        if (response.data) {
          const index = this.savedPolygons.findIndex(p => p.id === id)
          if (index !== -1)
            this.savedPolygons[index] = response.data

          if (this.currentSavedPolygon?.id === id)
            this.currentSavedPolygon = response.data
        }

        return response
      }
      catch (error) {
        console.error('Error updating saved polygon:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteSavedPolygon(id: number) {
      this.isLoading = true
      try {
        await deleteSavedPolygon(id)
        this.savedPolygons = this.savedPolygons.filter(p => p.id !== id)
        if (this.currentSavedPolygon?.id === id)
          this.currentSavedPolygon = null
      }
      catch (error) {
        console.error('Error deleting saved polygon:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    clearCurrentSavedPolygon() {
      this.currentSavedPolygon = null
    },
  },
})
