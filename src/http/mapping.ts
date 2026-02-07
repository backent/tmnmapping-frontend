import { getApi, postApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, QueryParams } from '@/types/api'
import type {
  MappingResponse,
  MappingFilters,
  MappingFilterOptions,
  PotentialClient,
  RegionSearchResponse,
  ScreenTypeOption,
} from '@/types/mapping'

/** Map viewport bounds for bounds-based fetching */
export interface MapBounds {
  minLat: number
  minLng: number
  maxLat: number
  maxLng: number
}

/**
 * Build query parameters from mapping filters
 * @param filters - Mapping filters
 * @param mapCenter - Map center coordinates (used as fallback for lat/lng when radius is set)
 * @param bounds - Optional map viewport bounds (minLat, minLng, maxLat, maxLng)
 */
function buildFilterParams(
  filters?: MappingFilters,
  mapCenter?: { lat: number; lng: number },
  bounds?: MapBounds | null,
): QueryParams {
  const params: QueryParams = {}

  if (!filters) {
    return params
  }

  if (filters.region) {
    params['filter[district_subdistrict]'] = filters.region
  }
  if (filters.district_subdistrict?.length) {
    params['filter[district_subdistrict]'] = filters.district_subdistrict.join(',')
  }
  if (filters.building_type?.length) {
    params['filter[building_type]'] = filters.building_type.join(',')
  }
  if (filters.building_grade?.length) {
    params['filter[building_grade]'] = filters.building_grade.join(',')
  }
  if (filters.installation?.length) {
    params['filter[installation]'] = filters.installation.join(',')
  }
  if (filters.screen_type?.length) {
    params['filter[screen_type]'] = filters.screen_type.join(',')
  }
  if (filters.screen_point?.length) {
    params['filter[screen_point]'] = filters.screen_point.join(',')
  }
  if (filters.progress?.length) {
    params['filter[progress]'] = filters.progress.join(',')
  }
  if (filters.lcd_presence?.length) {
    params['filter[lcd_presence]'] = filters.lcd_presence.join(',')
  }
  if (filters.sellable?.length) {
    params['filter[sellable]'] = filters.sellable.join(',')
  }
  if (filters.connectivity?.length) {
    params['filter[connectivity]'] = filters.connectivity.join(',')
  }
  if (filters.sales_package_ids?.length) {
    params['filter[sales_package_ids]'] = filters.sales_package_ids.join(',')
  }
  if (filters.building_restriction_ids?.length) {
    params['filter[building_restriction_ids]'] = filters.building_restriction_ids.join(',')
  }
  if (filters.year) {
    params['filter[year]'] = `${filters.year[0]},${filters.year[1]}`
  }

  // Spatial filters: polygon takes priority; when set, omit POI/lat/lng/radius
  if (filters.polygon && filters.polygon.length >= 3) {
    params['filter[polygon]'] = JSON.stringify(filters.polygon)
  } else {
    // POI filter handling
    if (filters.poi_id) {
      params['filter[poi_id]'] = filters.poi_id
      if (filters.radius) {
        params['filter[radius]'] = filters.radius * 1000 // Convert km to meters
      }
    } else {
      let lat: number | undefined
      let lng: number | undefined
      if (filters.radius && filters.radius > 0) {
        lat = mapCenter?.lat
        lng = mapCenter?.lng
      } else {
        lat = filters.lat ?? mapCenter?.lat
        lng = filters.lng ?? mapCenter?.lng
      }
      if (lat != null && lng != null) {
        params['filter[lat]'] = lat
        params['filter[lng]'] = lng
      }
      if (filters.radius) {
        params['filter[radius]'] = filters.radius * 1000 // Convert km to meters
      }
    }
  }

  if (filters.places_id) {
    params['filter[places_id]'] = filters.places_id
  }

  // Map viewport bounds (backend returns only buildings in view when set)
  if (bounds) {
    params['filter[min_lat]'] = bounds.minLat
    params['filter[max_lat]'] = bounds.maxLat
    params['filter[min_lng]'] = bounds.minLng
    params['filter[max_lng]'] = bounds.maxLng
  }

  return params
}

/**
 * Get mapping buildings with filters
 * @param filters - Mapping filters
 * @param mapCenter - Map center coordinates (used as fallback for lat/lng when radius is set)
 * @param bounds - Optional map viewport bounds; when set, backend returns only buildings in view
 */
export function getMappingBuildings(
  filters?: MappingFilters,
  mapCenter?: { lat: number; lng: number },
  bounds?: MapBounds | null,
): Promise<ApiResponse<MappingResponse>> {
  const params = buildFilterParams(filters, mapCenter, bounds)

  return getApi<ApiResponse<MappingResponse>>(
    apiConfig.endpoints.mapping_buildings,
    params,
  )
}

/**
 * Get cached mapping buildings (for performance)
 * @param filters - Mapping filters
 * @param mapCenter - Map center coordinates (used as fallback for lat/lng when radius is set)
 */
export function getCachedMappingBuildings(
  filters?: MappingFilters,
  mapCenter?: { lat: number; lng: number },
): Promise<ApiResponse<MappingResponse>> {
  const params = buildFilterParams(filters, mapCenter)

  return getApi<ApiResponse<MappingResponse>>(
    apiConfig.endpoints.mapping_buildings_cache,
    params,
  )
}

/**
 * Get mapping filter options
 */
export function getMappingFilterOptions(): Promise<ApiResponse<MappingFilterOptions>> {
  return getApi<ApiResponse<MappingFilterOptions>>(
    apiConfig.endpoints.mapping_filter_options,
  )
}

/**
 * Search regions (districts/subdistricts)
 */
export function searchRegions(
  query: string,
): Promise<ApiResponse<RegionSearchResponse>> {
  return getApi<ApiResponse<RegionSearchResponse>>(
    apiConfig.endpoints.mapping_regions,
    { 'filter[district_subdistrict]': query },
  )
}

/**
 * Get screen types with search
 */
export function searchScreenTypes(
  query: string,
): Promise<ApiResponse<ScreenTypeOption[]>> {
  return getApi<ApiResponse<ScreenTypeOption[]>>(
    apiConfig.endpoints.mapping_screen_types,
    { 'filter[size]': query },
  )
}

/**
 * Get all screen types
 */
export function getScreenTypes(): Promise<ApiResponse<ScreenTypeOption[]>> {
  return getApi<ApiResponse<ScreenTypeOption[]>>(
    apiConfig.endpoints.mapping_screen_types,
  )
}

/**
 * Get year list for year filter
 */
export function getYearList(): Promise<ApiResponse<{ year: number[] }>> {
  return getApi<ApiResponse<{ year: number[] }>>(
    apiConfig.endpoints.mapping_year_list,
    { sort: 'asc' },
  )
}

/**
 * Get potential clients
 */
export function getPotentialClients(): Promise<ApiResponse<PotentialClient[]>> {
  return getApi<ApiResponse<PotentialClient[]>>(
    apiConfig.endpoints.potential_clients,
    { rowsPerPage: 1000 },
  )
}

/**
 * Get potential client by ID
 */
export function getPotentialClientById(
  id: number,
): Promise<ApiResponse<PotentialClient>> {
  return getApi<ApiResponse<PotentialClient>>(
    apiConfig.endpoints.potential_client_get,
    {},
    { id },
  )
}

/**
 * Get potential client place by ID
 */
export function getPotentialClientPlace(
  id: number,
): Promise<ApiResponse<any>> {
  return getApi<ApiResponse<any>>(
    apiConfig.endpoints.potential_client_place,
    {},
    { id },
  )
}

/**
 * Get building details for mapping (full details with photos, job_detail_info, etc.)
 * This fetches the full building data needed for the BuildingDetail component
 * Note: The API returns Building type, which will be transformed to MappingBuilding in the component
 */
export function getBuildingDetailForMapping(
  id: number,
): Promise<ApiResponse<any>> {
  return getApi<ApiResponse<any>>(
    apiConfig.endpoints.buildings_get,
    {},
    { id },
  )
}

/** Export request body: filters + map_center, bounds always null (export all matching) */
export interface ExportMappingByFilterPayload {
  filters: {
    district_subdistrict?: string[]
    building_type?: string[]
    building_grade?: string[]
    progress?: string[]
    lcd_presence?: string[]
    sellable?: string[]
    connectivity?: string[]
    year?: [number, number]
    sales_package_ids?: number[]
    building_restriction_ids?: number[]
    lat?: number
    lng?: number
    radius?: number
    poi_id?: number
    polygon?: { lat: number; lng: number }[]
  }
  map_center: { lat: number; lng: number }
  bounds: null
}

/**
 * Build export payload from current filters and map center (bounds always null).
 */
export function buildExportPayload(
  filters: MappingFilters,
  mapCenter: { lat: number; lng: number },
): ExportMappingByFilterPayload {
  const f = filters
  const payload: ExportMappingByFilterPayload = {
    filters: {},
    map_center: { ...mapCenter },
    bounds: null,
  }
  if (f.district_subdistrict?.length)
    payload.filters.district_subdistrict = f.district_subdistrict
  if (f.building_type?.length)
    payload.filters.building_type = f.building_type as string[]
  if (f.building_grade?.length)
    payload.filters.building_grade = f.building_grade
  if (f.progress?.length)
    payload.filters.progress = f.progress
  if (f.lcd_presence?.length)
    payload.filters.lcd_presence = f.lcd_presence
  if (f.sellable?.length)
    payload.filters.sellable = f.sellable
  if (f.connectivity?.length)
    payload.filters.connectivity = f.connectivity
  if (f.year?.length === 2)
    payload.filters.year = [f.year[0], f.year[1]]
  if (f.sales_package_ids?.length)
    payload.filters.sales_package_ids = f.sales_package_ids
  if (f.building_restriction_ids?.length)
    payload.filters.building_restriction_ids = f.building_restriction_ids
  if (f.lat != null)
    payload.filters.lat = f.lat
  if (f.lng != null)
    payload.filters.lng = f.lng
  if (f.radius != null && f.radius > 0)
    payload.filters.radius = f.radius
  if (f.poi_id != null)
    payload.filters.poi_id = f.poi_id
  if (f.polygon && f.polygon.length >= 3)
    payload.filters.polygon = f.polygon
  return payload
}

/**
 * Export mapping data by filters (all buildings matching filters; bounds always null).
 */
export async function exportMappingDataByFilters(
  payload: ExportMappingByFilterPayload,
): Promise<Blob> {
  const response = await fetch(
    `${apiConfig.baseUrl}${apiConfig.endpoints.mapping_export}`.replace(':id', ''),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`)
  }

  return response.blob()
}

