/**
 * Building HTTP Service
 * Handles building-related API calls
 */

import { deleteApi, getApi, postApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { Building, BuildingScreenAvailable } from '@/types/building'

export interface BuildingCreateData {
  name: string
  address: string
  iris_building_id?: string | null
  external_building_id?: string | null
  project_name?: string | null
  resource_type_id?: number | null
  resource_type?: string | null
  audience?: number | null
  traffic_per_week?: number | null
  latitude?: number | null
  longitude?: number | null
  description?: string
  building_area_id?: number
  building_sub_area_id?: number
  building_type_id?: number
  building_area?: string
  building_sub_area?: string
  building_type?: string
}

export interface BuildingUpdateData extends BuildingCreateData {
  id: number
}

/**
 * Get list of buildings
 * Backend returns array directly in data field (not paginated)
 */
export function getBuildings(params?: PaginationParams): Promise<ApiResponse<Building[]>> {
  return getApi<ApiResponse<Building[]>>(apiConfig.endpoints.get_buildings, params || {})
}

/**
 * Get single building by ID
 */
export function getBuildingById(id: number): Promise<ApiResponse<Building>> {
  return getApi<ApiResponse<Building>>(apiConfig.endpoints.get_building_by_id, {}, { id })
}

/**
 * Create new building
 */
export function postBuilding(data: BuildingCreateData): Promise<ApiResponse<Building>> {
  return postApi<ApiResponse<Building>>(apiConfig.endpoints.create_building, data)
}

export interface BuildingBatchResult {
  index: number
  success: boolean
  building?: Building
  error?: string
}

export interface CreateBuildingsBatchResponse {
  results: BuildingBatchResult[]
  success_count: number
  error_count: number
}

/**
 * Create multiple buildings in batch
 */
export function postBuildingsBatch(data: BuildingCreateData[]): Promise<ApiResponse<CreateBuildingsBatchResponse>> {
  return postApi<ApiResponse<CreateBuildingsBatchResponse>>(apiConfig.endpoints.create_buildings_batch, { buildings: data })
}

/**
 * Update existing building
 */
export function putBuilding(id: number, data: BuildingUpdateData): Promise<ApiResponse<Building>> {
  return putApi<ApiResponse<Building>>(apiConfig.endpoints.update_building, data, { id })
}

/**
 * Delete building by ID
 */
export function deleteBuildingById(id: number): Promise<ApiResponse<any>> {
  return deleteApi<ApiResponse<any>>(apiConfig.endpoints.delete_building, {}, { id })
}

/**
 * Get available buildings (not assigned to any package, or excluding a specific package for edit mode)
 * Returns building+screen_type combinations
 */
export function getAvailableBuildings(excludePackageId?: number): Promise<ApiResponse<BuildingScreenAvailable[]>> {
  const params: any = {}
  if (excludePackageId !== undefined && excludePackageId > 0) {
    params.exclude_package_id = excludePackageId
  }
  return getApi<ApiResponse<BuildingScreenAvailable[]>>(apiConfig.endpoints.get_available_buildings, params)
}

export interface BuildingExportData {
  iris_building_id: string
  external_building_id: string
  building_id: number
  building_name: string
  project_name: string
  link_inside: string
  link_outside: string
}

/**
 * Get all buildings for export with short link codes
 */
export function getBuildingsForExport(): Promise<ApiResponse<BuildingExportData[]>> {
  return getApi<ApiResponse<BuildingExportData[]>>(apiConfig.endpoints.export_buildings)
}

