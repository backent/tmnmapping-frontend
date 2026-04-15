import { defineStore } from 'pinia'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'
import {
  createPOI,
  deletePOI,
  exportPOIs,
  getPOIById,
  getPOIs,
  importPOIs,
  updatePOI,
} from '@/http/poi'
import type { CreatePOIRequest, POI, UpdatePOIRequest } from '@/types/poi'
import type { PaginationParams } from '@/types/api'

interface POIState {
  pois: POI[]
  currentPOI: POI | null
  isLoading: boolean
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const usePOIStore = defineStore('poi', {
  state: (): POIState => ({
    pois: [],
    currentPOI: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  getters: {
    hasPOIs: (state): boolean => state.pois.length > 0,
  },

  actions: {
    async fetchPOIs(params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getPOIs(params)

        this.pois = response.data || []

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
        console.error('Error fetching POIs:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchPOIById(id: number) {
      this.isLoading = true
      try {
        const response = await getPOIById(id)

        this.currentPOI = response.data || null

        return response
      }
      catch (error) {
        console.error('Error fetching POI:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async createPOI(data: CreatePOIRequest) {
      this.isLoading = true
      try {
        const response = await createPOI(data)
        if (response.data)
          this.pois.push(response.data)

        return response
      }
      catch (error) {
        console.error('Error creating POI:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async updatePOI(id: number, data: UpdatePOIRequest) {
      this.isLoading = true
      try {
        const response = await updatePOI(id, data)
        if (response.data) {
          const index = this.pois.findIndex(p => p.id === id)
          if (index !== -1)
            this.pois[index] = response.data

          if (this.currentPOI?.id === id)
            this.currentPOI = response.data
        }

        return response
      }
      catch (error) {
        console.error('Error updating POI:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async deletePOI(id: number) {
      this.isLoading = true
      try {
        await deletePOI(id)
        this.pois = this.pois.filter(p => p.id !== id)
        if (this.currentPOI?.id === id)
          this.currentPOI = null
      }
      catch (error) {
        console.error('Error deleting POI:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async importPOIs(file: File) {
      this.isLoading = true
      try {
        return await importPOIs(file)
      }
      catch (error) {
        console.error('Error importing POIs:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async exportPOIs(search?: string) {
      try {
        const blob = await exportPOIs(search)
        const filename = `POI_Export_${dayjs().format('DD-MM-YYYY')}.xlsx`

        saveAs(blob, filename)
      }
      catch (error) {
        console.error('Error exporting POIs:', error)
        throw error
      }
    },

    clearCurrentPOI() {
      this.currentPOI = null
    },
  },
})
