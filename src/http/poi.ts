import { getApi, postApi, putApi, deleteApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse } from '@/types/api'
import type { POI, CreatePOIRequest, UpdatePOIRequest } from '@/types/poi'

// GET /pois - List all POIs
export function getPOIs(): Promise<ApiResponse<POI[]>> {
  return getApi<ApiResponse<POI[]>>(
    apiConfig.endpoints.pois_list,
  )
}

// GET /pois/:id - Get POI by ID
export function getPOIById(id: number): Promise<ApiResponse<POI>> {
  return getApi<ApiResponse<POI>>(
    apiConfig.endpoints.pois_get,
    {},
    { id },
  )
}

// POST /pois - Create POI
export function createPOI(data: CreatePOIRequest): Promise<ApiResponse<POI>> {
  return postApi<ApiResponse<POI>>(
    apiConfig.endpoints.pois_create,
    data,
  )
}

// PUT /pois/:id - Update POI
export function updatePOI(id: number, data: UpdatePOIRequest): Promise<ApiResponse<POI>> {
  return putApi<ApiResponse<POI>>(
    apiConfig.endpoints.pois_update,
    data,
    { id },
  )
}

// DELETE /pois/:id - Delete POI
export function deletePOI(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.pois_delete,
    {},
    { id },
  )
}
