import { getApi, postApi, putApi, deleteApi, postFormApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { POIPoint, CreatePOIPointRequest, UpdatePOIPointRequest, POIPointUsageResponse } from '@/types/poipoint'

export function getPOIPoints(params?: PaginationParams): Promise<ApiResponse<POIPoint[]>> {
  return getApi<ApiResponse<POIPoint[]>>(
    apiConfig.endpoints.poi_points_list,
    params || {},
  )
}

export function getPOIPointById(id: number): Promise<ApiResponse<POIPoint>> {
  return getApi<ApiResponse<POIPoint>>(
    apiConfig.endpoints.poi_points_get,
    {},
    { id },
  )
}

export function createPOIPoint(data: CreatePOIPointRequest): Promise<ApiResponse<POIPoint>> {
  return postApi<ApiResponse<POIPoint>>(
    apiConfig.endpoints.poi_points_create,
    data,
  )
}

export function updatePOIPoint(id: number, data: UpdatePOIPointRequest): Promise<ApiResponse<POIPoint>> {
  return putApi<ApiResponse<POIPoint>>(
    apiConfig.endpoints.poi_points_update,
    data,
    { id },
  )
}

export function deletePOIPoint(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.poi_points_delete,
    {},
    { id },
  )
}

export function getPOIPointUsage(id: number): Promise<ApiResponse<POIPointUsageResponse>> {
  return getApi<ApiResponse<POIPointUsageResponse>>(
    apiConfig.endpoints.poi_points_usage,
    {},
    { id },
  )
}

export function getPOIPointsDropdown(): Promise<ApiResponse<POIPoint[]>> {
  return getApi<ApiResponse<POIPoint[]>>(
    apiConfig.endpoints.poi_points_dropdown,
    {},
  )
}

export function importPOIPoints(file: File): Promise<ApiResponse<POIPoint[]>> {
  const formData = new FormData()
  formData.append('file', file)
  return postFormApi<ApiResponse<POIPoint[]>>(
    apiConfig.endpoints.poi_points_import,
    formData,
  )
}

export async function exportPOIPoints(search?: string): Promise<Blob> {
  const params = new URLSearchParams()
  if (search)
    params.set('search', search)

  const queryString = params.toString()
  const url = `${apiConfig.baseUrl}${apiConfig.endpoints.poi_points_export}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}
