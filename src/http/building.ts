import { getApi, postApi, postFormApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, QueryParams } from '@/types/api'
import type { Building, BuildingChange, BuildingDropdownOption, BuildingUpdateData, FilterOptions, PaginationParams, SaveBuildingRequest } from '@/types/building'
import type { ImportResult } from '@/types/advertiser'

// GET /buildings - List all buildings with optional pagination
export function getBuildings(params?: PaginationParams): Promise<ApiResponse<Building[]>> {
  return getApi<ApiResponse<Building[]>>(
    apiConfig.endpoints.buildings_list,
    (params || {}) as QueryParams,
  )
}

// GET /buildings/:id - Get single building
export function getBuildingById(id: number): Promise<ApiResponse<Building>> {
  return getApi<ApiResponse<Building>>(
    apiConfig.endpoints.buildings_get,
    {},
    { id },
  )
}

// PUT /buildings/:id - Update building (user fields only)
export function putBuilding(id: number, data: BuildingUpdateData): Promise<ApiResponse<Building>> {
  return putApi<ApiResponse<Building>>(
    apiConfig.endpoints.buildings_update,
    data,
    { id },
  )
}

// POST /buildings/sync - Trigger manual sync
/** Raise a building from the form. */
export function createBuilding(payload: SaveBuildingRequest): Promise<ApiResponse<Building>> {
  return postApi<ApiResponse<Building>>(apiConfig.endpoints.buildings_create, payload)
}

/**
 * Replace a building from the form.
 *
 * Distinct from putBuilding, which writes only sellable, connectivity and
 * resource_type -- right for the mapping screen's inline edit, wrong for a form that
 * shows every column.
 */
export function saveBuilding(id: number, payload: SaveBuildingRequest): Promise<ApiResponse<Building>> {
  return putApi<ApiResponse<Building>>(
    apiConfig.endpoints.buildings_save.replace(':id', String(id)), payload)
}

export function syncBuildings(): Promise<ApiResponse<string>> {
  return postApi<ApiResponse<string>>(
    apiConfig.endpoints.buildings_sync,
    {},
  )
}

// GET /buildings/filter-options - Get filter options for dropdowns
/**
 * With dryRun the file is checked and counted but nothing is written.
 *
 * A blank cell CLEARS on this import, unlike the price and brand imports where a
 * blank leaves the value alone. `cleared` counts the fields an upload will empty and
 * `notices` names each one, so the preview must be read before applying.
 */
export function importBuildings(file: File, dryRun: boolean): Promise<ApiResponse<ImportResult>> {
  const formData = new FormData()

  formData.append('file', file)

  return postFormApi<ApiResponse<ImportResult>>(
    `${apiConfig.endpoints.buildings_import}?dry_run=${dryRun}`, formData)
}

export function exportBuildings(): Promise<Blob> {
  return downloadBuildingFile(apiConfig.endpoints.buildings_export)
}

export function downloadBuildingTemplate(): Promise<Blob> {
  return downloadBuildingFile(apiConfig.endpoints.buildings_template)
}

/** Who changed what on one building, and when. The recovery path after a bad upload. */
export function getBuildingChanges(
  id: number,
  params: Record<string, string | number> = {},
): Promise<ApiResponse<BuildingChange[]>> {
  return getApi<ApiResponse<BuildingChange[]>>(
    apiConfig.endpoints.building_changes.replace(':id', String(id)), params)
}

async function downloadBuildingFile(endpoint: string): Promise<Blob> {
  const response = await fetch(`${apiConfig.baseUrl}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}

export function getFilterOptions(): Promise<ApiResponse<FilterOptions>> {
  return getApi<ApiResponse<FilterOptions>>(
    apiConfig.endpoints.buildings_filter_options,
  )
}

// GET /building-dropdown - Get lightweight building list for dropdown selection
export function getBuildingDropdownOptions(): Promise<ApiResponse<BuildingDropdownOption[]>> {
  return getApi<ApiResponse<BuildingDropdownOption[]>>(
    apiConfig.endpoints.buildings_dropdown,
  )
}
