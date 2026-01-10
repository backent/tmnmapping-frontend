import { defineStore } from 'pinia'
import {
  getBuildingById,
  getBuildings,
  putBuilding,
  syncBuildings,
  getFilterOptions,
} from '@/http/building'
import type { Building, BuildingUpdateData, PaginationParams, FilterOptions } from '@/types/building'

interface BuildingState {
  buildings: Building[]
  currentBuilding: Building | null
  isLoading: boolean
  isSyncing: boolean
  filterOptions: FilterOptions | null
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const useBuildingStore = defineStore('building', {
  state: (): BuildingState => ({
    buildings: [],
    currentBuilding: null,
    isLoading: false,
    isSyncing: false,
    filterOptions: null,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  getters: {
    // Check if has buildings
    hasBuildings: (state): boolean => {
      return state.buildings.length > 0
    },

    // Get building by ID
    getBuildingById: state => (id: number): Building | undefined => {
      return state.buildings.find(b => b.id === id)
    },

    // Get total number of buildings
    totalBuildings: (state): number => {
      return state.pagination.total
    },

    // Check if there are more pages
    hasMorePages: (state): boolean => {
      return state.pagination.currentPage < state.pagination.lastPage
    },
  },

  actions: {
    // Fetch all buildings with pagination
    async fetchBuildings(params?: PaginationParams) {
      this.isLoading = true

      try {
        const response = await getBuildings(params)

        this.buildings = response.data || []

        // Check if response has pagination metadata (extras)
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
          // If no pagination metadata, fallback
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
        console.error('Error fetching buildings:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    // Fetch single building
    async fetchBuildingById(id: number) {
      this.isLoading = true

      try {
        const response = await getBuildingById(id)
        this.currentBuilding = response.data
        return response
      }
      catch (error) {
        console.error('Error fetching building:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    // Update existing building (user fields only)
    async updateBuilding(id: number, data: BuildingUpdateData) {
      this.isLoading = true

      try {
        const response = await putBuilding(id, data)

        // Update in local state
        const index = this.buildings.findIndex(b => b.id === id)

        if (index !== -1)
          this.buildings[index] = response.data

        if (this.currentBuilding?.id === id)
          this.currentBuilding = response.data

        return response
      }
      catch (error) {
        console.error('Error updating building:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    // Trigger manual sync from ERP
    async triggerSync() {
      this.isSyncing = true

      try {
        const response = await syncBuildings()

        // Refresh buildings list after sync
        await this.fetchBuildings()

        return response
      }
      catch (error) {
        console.error('Error syncing buildings:', error)
        throw error
      }
      finally {
        this.isSyncing = false
      }
    },

    // Clear current building
    clearCurrentBuilding() {
      this.currentBuilding = null
    },

    // Fetch filter options for dropdowns
    async fetchFilterOptions() {
      try {
        const response = await getFilterOptions()
        this.filterOptions = response.data || null
        return response
      }
      catch (error) {
        console.error('Error fetching filter options:', error)
        throw error
      }
    },
  },
})
