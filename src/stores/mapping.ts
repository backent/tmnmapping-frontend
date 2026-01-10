import { defineStore } from 'pinia'
import {
  getCachedMappingBuildings,
  getMappingFilterOptions,
  searchRegions,
  searchScreenTypes,
  getScreenTypes,
  getYearList,
  getPotentialClients,
  getPotentialClientById,
  exportMappingData,
} from '@/http/mapping'
import type {
  MappingBuilding,
  MappingFilters,
  MappingFilterOptions,
  PotentialClient,
  RegionSearchResponse,
  ScreenTypeOption,
} from '@/types/mapping'

interface MappingState {
  buildings: MappingBuilding[]
  filterOptions: MappingFilterOptions | null
  filters: MappingFilters
  isLoading: boolean
  isSearching: boolean
  totals: {
    apartment: number
    hotel: number
    office: number
    retail: number
    other: number
  }
  selectedBuilding: MappingBuilding | null
  mapCenter: {
    lat: number
    lng: number
  }
  radius: number // in kilometers
  yearRange: [number, number]
  potentialClients: PotentialClient[]
  selectedPotentialClient: PotentialClient | null
  screenTypes: ScreenTypeOption[]
  regionSearchResults: RegionSearchResponse | null
}

export const useMappingStore = defineStore('mapping', {
  state: (): MappingState => ({
    buildings: [],
    filterOptions: null,
    filters: {
      lcd_presence: ['TMN'],
    },
    isLoading: false,
    isSearching: false,
    totals: {
      apartment: 0,
      hotel: 0,
      office: 0,
      retail: 0,
      other: 0,
    },
    selectedBuilding: null,
    mapCenter: {
      lat: -6.2,
      lng: 106.816666,
    },
    radius: 0,
    yearRange: [1980, new Date().getFullYear()],
    potentialClients: [],
    selectedPotentialClient: null,
    screenTypes: [],
    regionSearchResults: null,
  }),

  getters: {
    hasBuildings: (state): boolean => state.buildings.length > 0,

    totalBuildings: (state): number => {
      return (
        state.totals.apartment +
        state.totals.hotel +
        state.totals.office +
        state.totals.retail +
        state.totals.other
      )
    },

    hasActiveFilters: (state): boolean => {
      const filters = state.filters
      return !!(
        filters.region ||
        filters.district_subdistrict?.length ||
        filters.building_type?.length ||
        filters.building_grade?.length ||
        filters.installation?.length ||
        filters.screen_type?.length ||
        filters.progress?.length ||
        (filters.lcd_presence && filters.lcd_presence.length > 0 && filters.lcd_presence[0] !== 'TMN') ||
        filters.year ||
        filters.radius ||
        filters.places_id
      )
    },
  },

  actions: {
    /**
     * Fetch mapping buildings with current filters
     */
    async fetchBuildings() {
      this.isLoading = true

      try {
        const response = await getCachedMappingBuildings(this.filters)

        if (response.data) {
          this.buildings = response.data.data || []
          this.totals = {
            apartment: response.data.total_appartment || 0,
            hotel: response.data.total_hotel || 0,
            office: response.data.total_office || 0,
            retail: response.data.total_retail || 0,
            other: response.data.total_others || 0,
          }
        }

        return response
      }
      catch (error) {
        console.error('Error fetching mapping buildings:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    /**
     * Update filters and fetch buildings
     */
    async updateFilters(filters: Partial<MappingFilters>) {
      this.filters = { ...this.filters, ...filters }
      await this.fetchBuildings()
    },

    /**
     * Reset all filters
     */
    async resetFilters() {
      this.filters = {
        lcd_presence: ['TMN'],
      }
      this.mapCenter = {
        lat: -6.2,
        lng: 106.816666,
      }
      this.radius = 0
      await this.fetchBuildings()
    },

    /**
     * Set map center
     */
    setMapCenter(lat: number, lng: number) {
      this.mapCenter = { lat, lng }
      this.filters.lat = lat
      this.filters.lng = lng
    },

    /**
     * Set radius
     */
    setRadius(radius: number) {
      this.radius = radius
      this.filters.radius = radius
    },

    /**
     * Fetch filter options
     */
    async fetchFilterOptions() {
      try {
        const response = await getMappingFilterOptions()
        this.filterOptions = response.data || null
        return response
      }
      catch (error) {
        console.error('Error fetching filter options:', error)
        throw error
      }
    },

    /**
     * Search regions
     */
    async searchRegions(query: string) {
      this.isSearching = true
      try {
        const response = await searchRegions(query)
        this.regionSearchResults = response.data || null
        return response.data
      }
      catch (error) {
        console.error('Error searching regions:', error)
        throw error
      }
      finally {
        this.isSearching = false
      }
    },

    /**
     * Search screen types
     */
    async searchScreenTypes(query: string) {
      this.isSearching = true
      try {
        const response = await searchScreenTypes(query)
        return response.data
      }
      catch (error) {
        console.error('Error searching screen types:', error)
        throw error
      }
      finally {
        this.isSearching = false
      }
    },

    /**
     * Fetch all screen types
     */
    async fetchScreenTypes() {
      try {
        const response = await getScreenTypes()
        this.screenTypes = response.data || []
        return response
      }
      catch (error) {
        console.error('Error fetching screen types:', error)
        throw error
      }
    },

    /**
     * Fetch year list
     */
    async fetchYearList() {
      try {
        const response = await getYearList()
        if (response.data?.year?.length) {
          const years = response.data.year
          this.yearRange = [years[0], years[years.length - 1]]
        }
        return response
      }
      catch (error) {
        console.error('Error fetching year list:', error)
        throw error
      }
    },

    /**
     * Fetch potential clients
     */
    async fetchPotentialClients() {
      try {
        const response = await getPotentialClients()
        this.potentialClients = response.data || []
        return response
      }
      catch (error) {
        console.error('Error fetching potential clients:', error)
        throw error
      }
    },

    /**
     * Select potential client
     */
    async selectPotentialClient(id: number) {
      try {
        const response = await getPotentialClientById(id)
        this.selectedPotentialClient = response.data
        return response
      }
      catch (error) {
        console.error('Error fetching potential client:', error)
        throw error
      }
    },

    /**
     * Set selected building
     */
    setSelectedBuilding(building: MappingBuilding | null) {
      this.selectedBuilding = building
    },

    /**
     * Export mapping data
     */
    async exportData() {
      const ids = this.buildings.map(b => b.id)
      try {
        const blob = await exportMappingData(ids)
        return blob
      }
      catch (error) {
        console.error('Error exporting data:', error)
        throw error
      }
    },
  },
})

