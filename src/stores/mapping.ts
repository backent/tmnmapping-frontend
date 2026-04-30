import { defineStore } from 'pinia'
import {
  buildExportPayload,
  exportMappingDataByFilters,
  getMappingBuildings,
  getMappingFilterOptions,
  getPotentialClientById,
  getPotentialClients,
  getScreenTypes,
  getYearList,
  searchRegions,
  searchScreenTypes,
} from '@/http/mapping'
import { usePOIStore } from '@/stores/poi'
import type {
  MappingBuilding,
  MappingFilterOptions,
  MappingFilters,
  PotentialClient,
  RegionSearchResponse,
  ScreenTypeOption,
} from '@/types/mapping'
import type { POI } from '@/types/poi'

/** Map viewport bounds for bounds-based fetching */
export interface MapBounds { minLat: number; minLng: number; maxLat: number; maxLng: number }

// Loading-overlay smoothing: show the loader only when a fetch takes longer than
// LOADING_SHOW_DELAY_MS, then keep it visible for at least LOADING_MIN_VISIBLE_MS.
// This prevents a flicker on fast responses without making slow ones feel slower.
const LOADING_SHOW_DELAY_MS = 200
const LOADING_MIN_VISIBLE_MS = 400

let loadingShowTimer: ReturnType<typeof setTimeout> | null = null
let loadingHideTimer: ReturnType<typeof setTimeout> | null = null
let loadingShownAt = 0
let loadingActiveRequests = 0

interface LoadingTarget { isLoadingVisible: boolean }

function markLoadingStart(store: LoadingTarget) {
  loadingActiveRequests += 1
  if (loadingHideTimer) {
    clearTimeout(loadingHideTimer)
    loadingHideTimer = null
  }
  if (store.isLoadingVisible || loadingShowTimer)
    return
  loadingShowTimer = setTimeout(() => {
    store.isLoadingVisible = true
    loadingShownAt = Date.now()
    loadingShowTimer = null
  }, LOADING_SHOW_DELAY_MS)
}

function markLoadingEnd(store: LoadingTarget) {
  loadingActiveRequests = Math.max(0, loadingActiveRequests - 1)
  if (loadingActiveRequests > 0)
    return
  if (loadingShowTimer) {
    clearTimeout(loadingShowTimer)
    loadingShowTimer = null
    return
  }
  if (store.isLoadingVisible) {
    const remaining = Math.max(0, LOADING_MIN_VISIBLE_MS - (Date.now() - loadingShownAt))

    loadingHideTimer = setTimeout(() => {
      store.isLoadingVisible = false
      loadingHideTimer = null
    }, remaining)
  }
}

/**
 * Test-only: reset the module-level loading-smoothing state. Tests that run
 * fetchBuildings with fake timers should call this in beforeEach so state
 * from a previous test doesn't leak.
 */
export function __resetLoadingSmoothingForTests() {
  if (loadingShowTimer) {
    clearTimeout(loadingShowTimer)
    loadingShowTimer = null
  }
  if (loadingHideTimer) {
    clearTimeout(loadingHideTimer)
    loadingHideTimer = null
  }
  loadingShownAt = 0
  loadingActiveRequests = 0
}

interface MappingState {
  buildings: MappingBuilding[]

  /** Accumulated buildings by id (merged on each fetch); used for marker pool + visibility */
  buildingsAccumulated: Record<string, MappingBuilding>
  filterOptions: MappingFilterOptions | null
  filters: MappingFilters
  isLoading: boolean
  /** Smoothed loading signal for UI — delay-then-show + minimum-visible. Use this for spinners. */
  isLoadingVisible: boolean
  isSearching: boolean
  totals: Record<string, number> // Dynamic totals map - key is building type (lowercase), value is count
  selectedBuilding: MappingBuilding | null
  mapCenter: {
    lat: number
    lng: number
  }

  /** Coordinates of the location chosen via the LocationFilter autocomplete; null = no marker */
  searchedLocation: { lat: number; lng: number } | null

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

  /** Monotonic counter; increment to request MapView fit bounds to the current polygon */
  fitBoundsToPolygon: number
}

export const useMappingStore = defineStore('mapping', {
  state: (): MappingState => ({
    buildings: [],
    buildingsAccumulated: {},
    filterOptions: null,
    filters: {
      lcd_presence: ['TMN'], // Empty array shows all LCD presence statuses
    },
    isLoading: false,
    isLoadingVisible: false,
    isSearching: false,
    totals: {},
    selectedBuilding: null,
    mapBounds: null,
    mapCenter: {
      lat: -6.2,
      lng: 106.816666,
    },
    searchedLocation: null,
    radius: 0,
    yearRange: [1980, new Date().getFullYear()],
    potentialClients: [],
    selectedPotentialClient: null,
    screenTypes: [],
    regionSearchResults: null,
    selectedPOIs: [],
    drawPolygonActive: false,
    fitBoundsToPolygon: 0,
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
        filters.region
        || filters.district_subdistrict?.length
        || filters.building_type?.length
        || filters.building_grade?.length
        || filters.installation?.length
        || filters.screen_type?.length
        || filters.progress?.length
        || (filters.lcd_presence && filters.lcd_presence.length > 0 && filters.lcd_presence[0] !== 'TMN')
        || filters.sellable?.length
        || filters.connectivity?.length
        || filters.sales_package_ids?.length
        || filters.building_restriction_ids?.length
        || filters.year
        || filters.radius
        || filters.places_id
        || filters.poi_ids?.length
        || (filters.polygon && filters.polygon.length >= 3)
      )
    },
  },

  actions: {
    /**
     * Fetch mapping buildings with current filters
     */
    async fetchBuildings() {
      this.isLoading = true
      markLoadingStart(this)

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
          for (const building of transformed)
            this.buildingsAccumulated[String(building.id)] = building

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
        markLoadingEnd(this)
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
        lcd_presence: ['TMN'], // Empty array shows all LCD presence statuses
      }
      this.mapCenter = {
        lat: -6.2,
        lng: 106.816666,
      }
      this.searchedLocation = null
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

    setSearchedLocation(lat: number, lng: number) {
      this.searchedLocation = { lat, lng }
    },

    clearSearchedLocation() {
      this.searchedLocation = null
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
        if (poiStore.pois.length === 0)
          await poiStore.fetchPOIs({ take: 1000, skip: 0 })

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
     * Implemented as a monotonic counter so that repeated requests — including switching from
     * one saved polygon to another while a fit is already pending/completed — always trigger
     * MapView's watcher, regardless of prior state.
     */
    setFitBoundsToPolygon(value: boolean = true) {
      if (value)
        this.fitBoundsToPolygon += 1
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
        return await exportMappingDataByFilters(payload)
      }
      catch (error) {
        console.error('Error exporting data:', error)
        throw error
      }
    },
  },
})
