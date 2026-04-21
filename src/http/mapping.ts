import { getApi, postApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse } from '@/types/api'
import type {
  MappingFilterOptions,
  MappingFilters,
  MappingResponse,
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

/** Body shape for POST /mapping-buildings. Mirrors the export payload plus typed bounds. */
export interface MappingBuildingsPayload {
  filters: ExportMappingByFilterPayload['filters']
  map_center: { lat: number; lng: number }
  bounds: MapBounds | null
}

/**
 * Build the POST body for the buildings fetch. Filters are projected by the shared
 * `buildExportPayload` so mapping and export stay in sync; bounds are mapping-only.
 */
export function buildMappingBuildingsPayload(
  filters: MappingFilters | undefined,
  mapCenter: { lat: number; lng: number } | undefined,
  bounds: MapBounds | null | undefined,
): MappingBuildingsPayload {
  const base = buildExportPayload(filters ?? {}, mapCenter ?? { lat: 0, lng: 0 })

  return {
    filters: base.filters,
    map_center: base.map_center,
    bounds: bounds ?? null,
  }
}

/**
 * Get mapping buildings with filters. POSTs a JSON body so large polygons
 * (hundreds of points) cannot overflow Nginx URL-size limits.
 * @param filters - Mapping filters
 * @param mapCenter - Map center coordinates (used as fallback for lat/lng when radius is set)
 * @param bounds - Optional map viewport bounds; when set, backend returns only buildings in view
 */
export function getMappingBuildings(
  filters?: MappingFilters,
  mapCenter?: { lat: number; lng: number },
  bounds?: MapBounds | null,
): Promise<ApiResponse<MappingResponse>> {
  const payload = buildMappingBuildingsPayload(filters, mapCenter, bounds)

  return postApi<ApiResponse<MappingResponse>>(
    apiConfig.endpoints.mapping_buildings,
    payload,
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
    poi_ids?: number[]
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
  if (f.poi_ids?.length)
    payload.filters.poi_ids = f.poi_ids
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

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}
