import { deleteApi, getApi, postApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { CreateSavedPolygonRequest, SavedPolygon, UpdateSavedPolygonRequest } from '@/types/savedpolygon'

export function getSavedPolygons(params?: PaginationParams): Promise<ApiResponse<SavedPolygon[]>> {
  return getApi<ApiResponse<SavedPolygon[]>>(
    apiConfig.endpoints.saved_polygons_list,
    params || {},
  )
}

export function getSavedPolygonById(id: number): Promise<ApiResponse<SavedPolygon>> {
  return getApi<ApiResponse<SavedPolygon>>(
    apiConfig.endpoints.saved_polygons_get,
    {},
    { id },
  )
}

export function createSavedPolygon(data: CreateSavedPolygonRequest): Promise<ApiResponse<SavedPolygon>> {
  return postApi<ApiResponse<SavedPolygon>>(
    apiConfig.endpoints.saved_polygons_create,
    data,
  )
}

export function updateSavedPolygon(id: number, data: UpdateSavedPolygonRequest): Promise<ApiResponse<SavedPolygon>> {
  return putApi<ApiResponse<SavedPolygon>>(
    apiConfig.endpoints.saved_polygons_update,
    data,
    { id },
  )
}

export function deleteSavedPolygon(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.saved_polygons_delete,
    {},
    { id },
  )
}
