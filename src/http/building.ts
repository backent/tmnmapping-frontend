import { getApi, postApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, QueryParams } from '@/types/api'
import type { Building, BuildingUpdateData, PaginationParams } from '@/types/building'

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
export function syncBuildings(): Promise<ApiResponse<string>> {
  return postApi<ApiResponse<string>>(
    apiConfig.endpoints.buildings_sync,
    {},
  )
}
