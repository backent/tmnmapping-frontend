import { defineStore } from 'pinia'
import {
  getPOIs,
  getPOIById,
  createPOI,
  updatePOI,
  deletePOI,
} from '@/http/poi'
import type { POI, CreatePOIRequest, UpdatePOIRequest } from '@/types/poi'

interface POIState {
  pois: POI[]
  currentPOI: POI | null
  isLoading: boolean
}

export const usePOIStore = defineStore('poi', {
  state: (): POIState => ({
    pois: [],
    currentPOI: null,
    isLoading: false,
  }),

  getters: {
    hasPOIs: (state): boolean => state.pois.length > 0,
  },

  actions: {
    /**
     * Fetch all POIs
     */
    async fetchPOIs() {
      this.isLoading = true
      try {
        const response = await getPOIs()
        this.pois = response.data || []
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

    /**
     * Fetch POI by ID
     */
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

    /**
     * Create POI
     */
    async createPOI(data: CreatePOIRequest) {
      this.isLoading = true
      try {
        const response = await createPOI(data)
        // Add to list
        if (response.data) {
          this.pois.push(response.data)
        }
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

    /**
     * Update POI
     */
    async updatePOI(id: number, data: UpdatePOIRequest) {
      this.isLoading = true
      try {
        const response = await updatePOI(id, data)
        // Update in list
        if (response.data) {
          const index = this.pois.findIndex(p => p.id === id)
          if (index !== -1) {
            this.pois[index] = response.data
          }
          // Update current if it's the same
          if (this.currentPOI?.id === id) {
            this.currentPOI = response.data
          }
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

    /**
     * Delete POI
     */
    async deletePOI(id: number) {
      this.isLoading = true
      try {
        await deletePOI(id)
        // Remove from list
        this.pois = this.pois.filter(p => p.id !== id)
        // Clear current if it's the same
        if (this.currentPOI?.id === id) {
          this.currentPOI = null
        }
      }
      catch (error) {
        console.error('Error deleting POI:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * Clear current POI
     */
    clearCurrentPOI() {
      this.currentPOI = null
    },
  },
})
