/**
 * Building Store
 * Manages building data and CRUD operations
 */

import { defineStore } from 'pinia'
import {
  deleteBuildingById,
  getBuildings,
  getBuildingById,
  getAvailableBuildings,
  postBuilding,
  postBuildingsBatch,
  putBuilding,
} from '@/http/building'
import type { BuildingCreateData, BuildingUpdateData } from '@/http/building'
import type { Building, BuildingScreenAvailable } from '@/types/building'
import type { PaginationParams } from '@/types/api'

interface BuildingState {
  buildings: Building[]
  availableCombinations: BuildingScreenAvailable[]
  currentBuilding: Building | null
  isLoading: boolean
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
    availableCombinations: [],
    currentBuilding: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  getters: {
    /**
     * Get total number of buildings
     */
    totalBuildings: (state): number => {
      return state.buildings.length
    },

    /**
     * Check if there are more pages
     */
    hasMorePages: (state): boolean => {
      return state.pagination.currentPage < state.pagination.lastPage
    },

    /**
     * Get buildings sorted by name
     */
    buildingsSortedByName: (state): Building[] => {
      return [...state.buildings].sort((a, b) => a.name.localeCompare(b.name))
    },
  },

  actions: {
    /**
     * Fetch buildings
     * Supports pagination if backend provides it
     */
    async fetchBuildings(params?: PaginationParams) {
      this.isLoading = true
      
      try {
        const response = await getBuildings(params)
        
        // Backend returns array directly in data field
        this.buildings = response.data || []
        
        // Check if response has pagination metadata (extras)
        if (response.extras) {
          const take = response.extras.take || 10
          const skip = response.extras.skip || 0
          const total = response.extras.total || response.data.length
          
          this.pagination = {
            currentPage: Math.floor(skip / take) + 1,
            lastPage: Math.ceil(total / take) || 1,
            perPage: take,
            total: total,
          }
        }
        else {
          // If no pagination metadata, calculate from array
          // This handles non-paginated responses
          this.pagination.total = response.data?.length || 0
          this.pagination.currentPage = params?.skip ? Math.floor((params.skip / (params.take || 10)) + 1) : 1
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

    /**
     * Fetch single building by ID
     */
    async fetchBuildingById(id: number) {
      this.isLoading = true
      
      try {
        const response = await getBuildingById(id)
        
        if (response.data) {
          this.currentBuilding = response.data
        }
        
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

    /**
     * Create new building
     */
    async createBuilding(data: BuildingCreateData) {
      this.isLoading = true
      
      try {
        const response = await postBuilding(data)
        
        // Add the new building to the list
        if (response.data) {
          this.buildings.unshift(response.data)
          this.pagination.total += 1
        }
        
        return response
      }
      catch (error) {
        console.error('Error creating building:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * Create multiple buildings in batch
     */
    async createBuildingsBatch(data: BuildingCreateData[]) {
      this.isLoading = true
      
      try {
        const response = await postBuildingsBatch(data)
        
        // Add successfully created buildings to the list
        if (response.data && response.data.results) {
          const successfulBuildings = response.data.results
            .filter(result => result.success && result.building)
            .map(result => result.building!)
          
          // Add new buildings to the list
          this.buildings.unshift(...successfulBuildings)
          this.pagination.total += successfulBuildings.length
        }
        
        return response
      }
      catch (error) {
        console.error('Error creating buildings in batch:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * Update existing building
     */
    async updateBuilding(id: number, data: BuildingUpdateData) {
      this.isLoading = true
      
      try {
        const response = await putBuilding(id, data)
        
        // Update the building in the list
        if (response.data) {
          const index = this.buildings.findIndex(b => b.id === id)
          
          if (index !== -1) {
            this.buildings[index] = response.data
          }
          
          // Update current building if it's the one being edited
          if (this.currentBuilding?.id === id) {
            this.currentBuilding = response.data
          }
        }
        
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

    /**
     * Delete building by ID
     */
    async deleteBuilding(id: number) {
      this.isLoading = true
      
      try {
        const response = await deleteBuildingById(id)
        
        // Remove the building from the list
        const index = this.buildings.findIndex(b => b.id === id)
        
        if (index !== -1) {
          this.buildings.splice(index, 1)
          this.pagination.total -= 1
        }
        
        // Clear current building if it's the one being deleted
        if (this.currentBuilding?.id === id) {
          this.currentBuilding = null
        }
        
        return response
      }
      catch (error) {
        console.error('Error deleting building:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * Clear current building
     */
    clearCurrentBuilding() {
      this.currentBuilding = null
    },

    /**
     * Clear all buildings
     */
    clearBuildings() {
      this.buildings = []
      this.currentBuilding = null
      this.pagination = {
        currentPage: 1,
        lastPage: 1,
        perPage: 10,
        total: 0,
      }
    },

    /**
     * Fetch available buildings (not assigned to any package, or excluding a specific package for edit mode)
     * Now returns building+screen_type combinations
     */
    async fetchAvailableBuildings(excludePackageId?: number) {
      this.isLoading = true
      
      try {
        const response = await getAvailableBuildings(excludePackageId)
        
        // Backend returns array of BuildingScreenAvailable in data field
        this.availableCombinations = response.data || []
        
        // Extract unique buildings for backward compatibility and building info lookup
        const buildingMap = new Map<number, Building>()
        this.availableCombinations.forEach(combination => {
          if (!buildingMap.has(combination.building.id)) {
            buildingMap.set(combination.building.id, combination.building)
          }
        })
        this.buildings = Array.from(buildingMap.values())
        
        // Reset pagination for available buildings
        this.pagination = {
          currentPage: 1,
          lastPage: 1,
          perPage: this.availableCombinations.length || 10,
          total: this.availableCombinations.length || 0,
        }
        
        return response
      }
      catch (error) {
        console.error('Error fetching available buildings:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },
  },
})

