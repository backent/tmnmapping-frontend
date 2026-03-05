import { defineStore } from 'pinia'
import {
  getMappingBuildings,
  getMappingFilterOptions,
  searchRegions,
  searchScreenTypes,
  getScreenTypes,
  getYearList,
  getPotentialClients,
  getPotentialClientById,
  buildExportPayload,
  exportMappingDataByFilters,
} from '@/http/mapping'
import { usePOIStore } from '@/stores/poi'
import type {
  MappingBuilding,
  MappingFilters,
  MappingFilterOptions,
  PotentialClient,
  RegionSearchResponse,
  ScreenTypeOption,
} from '@/types/mapping'
import type { POI } from '@/types/poi'

/** Map viewport bounds for bounds-based fetching */
export type MapBounds = { minLat: number; minLng: number; maxLat: number; maxLng: number }

interface MappingState {
  buildings: MappingBuilding[]
  /** Accumulated buildings by id (merged on each fetch); used for marker pool + visibility */
  buildingsAccumulated: Record<string, MappingBuilding>
  filterOptions: MappingFilterOptions | null
  filters: MappingFilters
  isLoading: boolean
  isSearching: boolean
  totals: Record<string, number> // Dynamic totals map - key is building type (lowercase), value is count
  selectedBuilding: MappingBuilding | null
  mapCenter: {
    lat: number
    lng: number
  }
  /** Map viewport bounds; when set, fetch returns only buildings in view */
  mapBounds: MapBounds | null
  radius: number // in kilometers
  yearRange: [number, number]
  potentialClients: PotentialClient[]
  selectedPotentialClient: PotentialClient | null
  screenTypes: ScreenTypeOption[]
  regionSearchResults: RegionSearchResponse | null
  selectedPOIs: POI[]
  drawPolygonActive: boolean
  /** When true, MapView should fit bounds to the current polygon once then clear this flag */
  fitBoundsToPolygon: boolean
}

export const useMappingStore = defineStore('mapping', {
  state: (): MappingState => ({
    buildings: [],
    buildingsAccumulated: {},
    filterOptions: null,
    filters: {
      lcd_presence: ["TMN"], // Empty array shows all LCD presence statuses
    },
    isLoading: false,
    isSearching: false,
    totals: {},
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
    selectedPOIs: [],
    drawPolygonActive: false,
    fitBoundsToPolygon: false,
  }),

  getters: {
    hasBuildings: (state): boolean => state.buildings.length > 0,

    totalBuildings: (state): number => {
      // Sum all values in the totals map
      return Object.values(state.totals).reduce((sum, count) => sum + count, 0)
    },

    buildingsAccumulatedList: (state): MappingBuilding[] =>
      Object.values(state.buildingsAccumulated),

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
        filters.sellable?.length ||
        filters.connectivity?.length ||
        filters.sales_package_ids?.length ||
        filters.building_restriction_ids?.length ||
        filters.year ||
        filters.radius ||
        filters.places_id ||
        filters.poi_ids?.length ||
        (filters.polygon && filters.polygon.length >= 3)
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
        const response = await getMappingBuildings(this.filters, this.mapCenter, this.mapBounds)

        if (response.data) {
          // Transform backend response to include coordinates object
          const transformed = (response.data.data || []).map((building: any) => ({
            ...building,
            building_name: building.name,
            coordinates: {
              lat: building.latitude,
              lng: building.longitude,
            },
          }))
          this.buildings = transformed

          // Merge into accumulated so we never destroy markers; only show/hide by current response
          for (const building of transformed) {
            this.buildingsAccumulated[String(building.id)] = building
          }

          // Use dynamic totals map from backend
          this.totals = response.data.totals || {}
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
        lcd_presence: ["TMN"], // Empty array shows all LCD presence statuses
      }
      this.mapCenter = {
        lat: -6.2,
        lng: 106.816666,
      }
      this.radius = 0
      this.selectedPOIs = []
      this.drawPolygonActive = false
      await this.fetchBuildings()
    },

    /**
     * Set map viewport bounds and optionally refetch (caller may call fetchBuildings after)
     */
    setMapBounds(bounds: MapBounds | null) {
      this.mapBounds = bounds
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
     * Set radius (km). Normalize so 0 / undefined / NaN clears the radius and hides the center marker.
     */
    setRadius(radius: number) {
      const value = Number(radius)
      const normalized = Number.isFinite(value) && value >= 0 ? value : 0
      this.radius = normalized
      this.filters.radius = normalized > 0 ? normalized : undefined
    },

    /**
     * Set selected POIs (multi-select). Pass empty array to clear.
     */
    async setSelectedPOIs(poiIds: number[]) {
      if (poiIds.length === 0) {
        this.selectedPOIs = []
        this.filters.poi_ids = undefined
        this.filters.radius = undefined
        this.filters.lat = undefined
        this.filters.lng = undefined
        this.radius = 0
        await this.fetchBuildings()
        return
      }

      try {
        const poiStore = usePOIStore()
        // Ensure POI list is loaded
        if (poiStore.pois.length === 0) {
          await poiStore.fetchPOIs({ take: 1000, skip: 0 })
        }
        const selectedPOIs = poiIds
          .map(id => poiStore.pois.find(p => p.id === id))
          .filter((p): p is POI => p !== undefined)

        this.selectedPOIs = selectedPOIs
        this.filters.poi_ids = selectedPOIs.map(p => p.id)
        this.filters.radius = undefined
        this.filters.lat = undefined
        this.filters.lng = undefined
        this.radius = 0
        await this.fetchBuildings()
      }
      catch (error) {
        console.error('Error setting selected POIs:', error)
        this.selectedPOIs = []
        this.filters.poi_ids = undefined
      }
    },

    /**
     * Set polygon filter (drawn on map). Clears draw mode and fetches buildings.
     */
    async setPolygon(path: { lat: number; lng: number }[] | null) {
      if (path === null) {
        console.log('[mapping store] setPolygon(null) – clearing polygon filter')
      }
      this.filters.polygon = path ?? undefined
      this.drawPolygonActive = false
      await this.fetchBuildings()
    },

    /**
     * Enable or disable polygon drawing mode on the map.
     */
    setDrawPolygonActive(active: boolean) {
      this.drawPolygonActive = active
    },

    /**
     * Request that the map fit bounds to the current polygon (e.g. after loading a saved polygon).
     */
    setFitBoundsToPolygon(value: boolean) {
      this.fitBoundsToPolygon = value
    },

    /**
     * Clear selected POIs
     */
    clearSelectedPOIs() {
      this.selectedPOIs = []
      this.filters.poi_ids = undefined
      this.filters.radius = undefined
      this.filters.lat = undefined
      this.filters.lng = undefined
      this.radius = 0
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
     * Export mapping data (all buildings matching current filters; bounds always null).
     */
    async exportData() {
      const payload = buildExportPayload(this.filters, this.mapCenter)
      try {
        const blob = await exportMappingDataByFilters(payload)
        return blob
      }
      catch (error) {
        console.error('Error exporting data:', error)
        throw error
      }
    },
  },
})

