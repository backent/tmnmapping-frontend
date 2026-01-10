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

/**
 * Build query parameters from mapping filters
 */
function buildFilterParams(filters?: MappingFilters): QueryParams {
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
  if (filters.year) {
    params['filter[year]'] = `${filters.year[0]},${filters.year[1]}`
  }
  if (filters.lat && filters.lng) {
    params['filter[lat]'] = filters.lat
    params['filter[lng]'] = filters.lng
  }
  if (filters.radius) {
    params['filter[radius]'] = filters.radius * 1000 // Convert km to meters
  }
  if (filters.places_id) {
    params['filter[places_id]'] = filters.places_id
  }

  return params
}

/**
 * Get mapping buildings with filters
 */
export function getMappingBuildings(
  filters?: MappingFilters,
): Promise<ApiResponse<MappingResponse>> {
  const params = buildFilterParams(filters)

  return getApi<ApiResponse<MappingResponse>>(
    apiConfig.endpoints.mapping_buildings,
    params,
  )
}

/**
 * Get cached mapping buildings (for performance)
 */
export function getCachedMappingBuildings(
  filters?: MappingFilters,
): Promise<ApiResponse<MappingResponse>> {
  const params = buildFilterParams(filters)

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
 * Export mapping data
 */
export async function exportMappingData(
  buildingIds: number[],
): Promise<Blob> {
  const response = await fetch(
    `${apiConfig.baseUrl}${apiConfig.endpoints.mapping_export}`.replace(':id', ''),
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ ids: buildingIds }),
    },
  )

  if (!response.ok) {
    throw new Error(`HTTP error! Status: ${response.status}`)
  }

  return response.blob()
}

