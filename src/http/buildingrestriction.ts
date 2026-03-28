import { getApi, postApi, putApi, deleteApi, postFormApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { BuildingRestriction, CreateBuildingRestrictionRequest, UpdateBuildingRestrictionRequest } from '@/types/buildingrestriction'

export function getBuildingRestrictions(params?: PaginationParams): Promise<ApiResponse<BuildingRestriction[]>> {
  return getApi<ApiResponse<BuildingRestriction[]>>(
    apiConfig.endpoints.building_restrictions_list,
    params || {},
  )
}

export function getBuildingRestrictionById(id: number): Promise<ApiResponse<BuildingRestriction>> {
  return getApi<ApiResponse<BuildingRestriction>>(
    apiConfig.endpoints.building_restrictions_get,
    {},
    { id },
  )
}

export function createBuildingRestriction(data: CreateBuildingRestrictionRequest): Promise<ApiResponse<BuildingRestriction>> {
  return postApi<ApiResponse<BuildingRestriction>>(
    apiConfig.endpoints.building_restrictions_create,
    data,
  )
}

export function updateBuildingRestriction(id: number, data: UpdateBuildingRestrictionRequest): Promise<ApiResponse<BuildingRestriction>> {
  return putApi<ApiResponse<BuildingRestriction>>(
    apiConfig.endpoints.building_restrictions_update,
    data,
    { id },
  )
}

export function deleteBuildingRestriction(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.building_restrictions_delete,
    {},
    { id },
  )
}

export function importBuildingRestrictions(file: File): Promise<ApiResponse<BuildingRestriction[]>> {
  const formData = new FormData()
  formData.append('file', file)
  return postFormApi<ApiResponse<BuildingRestriction[]>>(
    apiConfig.endpoints.building_restrictions_import,
    formData,
  )
}

export async function exportBuildingRestrictions(search?: string): Promise<Blob> {
  const params = new URLSearchParams()
  if (search)
    params.set('search', search)

  const queryString = params.toString()
  const url = `${apiConfig.baseUrl}${apiConfig.endpoints.building_restrictions_export}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}
