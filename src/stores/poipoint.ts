import { defineStore } from 'pinia'
import { saveAs } from 'file-saver'
import dayjs from 'dayjs'
import {
  createPOIPoint,
  deletePOIPoint,
  exportPOIPoints,
  getPOIPointById,
  getPOIPointUsage,
  getPOIPoints,
  getPOIPointsDropdown,
  importPOIPoints,
  updatePOIPoint,
} from '@/http/poipoint'
import type { CreatePOIPointRequest, POIPoint, POIPointUsageResponse, UpdatePOIPointRequest } from '@/types/poipoint'
import type { PaginationParams } from '@/types/api'

interface POIPointState {
  points: POIPoint[]
  currentPoint: POIPoint | null
  dropdownPoints: POIPoint[]
  isLoading: boolean
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const usePOIPointStore = defineStore('poipoint', {
  state: (): POIPointState => ({
    points: [],
    currentPoint: null,
    dropdownPoints: [],
    isLoading: false,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  actions: {
    async fetchPOIPoints(params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getPOIPoints(params)

        this.points = response.data || []
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
        console.error('Error fetching POI points:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchPOIPointById(id: number) {
      this.isLoading = true
      try {
        const response = await getPOIPointById(id)

        this.currentPoint = response.data || null

        return response
      }
      catch (error) {
        console.error('Error fetching POI point:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async createPOIPoint(data: CreatePOIPointRequest) {
      this.isLoading = true
      try {
        const response = await createPOIPoint(data)
        if (response.data)
          this.points.push(response.data)

        return response
      }
      catch (error) {
        console.error('Error creating POI point:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async updatePOIPoint(id: number, data: UpdatePOIPointRequest) {
      this.isLoading = true
      try {
        const response = await updatePOIPoint(id, data)
        if (response.data) {
          const index = this.points.findIndex(p => p.id === id)
          if (index !== -1)
            this.points[index] = response.data

          if (this.currentPoint?.id === id)
            this.currentPoint = response.data
        }

        return response
      }
      catch (error) {
        console.error('Error updating POI point:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async deletePOIPoint(id: number) {
      this.isLoading = true
      try {
        await deletePOIPoint(id)
        this.points = this.points.filter(p => p.id !== id)
        if (this.currentPoint?.id === id)
          this.currentPoint = null
      }
      catch (error) {
        console.error('Error deleting POI point:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchPOIPointUsage(id: number): Promise<POIPointUsageResponse> {
      try {
        const response = await getPOIPointUsage(id)

        return response.data
      }
      catch (error) {
        console.error('Error fetching POI point usage:', error)
        throw error
      }
    },

    async fetchPOIPointsDropdown() {
      try {
        const response = await getPOIPointsDropdown()

        this.dropdownPoints = response.data || []

        return response
      }
      catch (error) {
        console.error('Error fetching POI points dropdown:', error)
        throw error
      }
    },

    async importPOIPoints(file: File) {
      this.isLoading = true
      try {
        return await importPOIPoints(file)
      }
      catch (error) {
        console.error('Error importing POI points:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async exportPOIPoints(search?: string) {
      try {
        const blob = await exportPOIPoints(search)
        const filename = `POIPoint_Export_${dayjs().format('DD-MM-YYYY')}.xlsx`

        saveAs(blob, filename)
      }
      catch (error) {
        console.error('Error exporting POI points:', error)
        throw error
      }
    },

    clearCurrentPoint() {
      this.currentPoint = null
    },
  },
})
