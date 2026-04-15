import { deleteApi, getApi, postApi, postFormApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { CreatePOIRequest, POI, UpdatePOIRequest } from '@/types/poi'

// GET /pois - List all POIs with pagination and optional search
export function getPOIs(params?: PaginationParams): Promise<ApiResponse<POI[]>> {
  return getApi<ApiResponse<POI[]>>(
    apiConfig.endpoints.pois_list,
    (params || {}) as Record<string, string | number | boolean | undefined | null>,
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

// POST /pois/import - Import POIs from xlsx/csv
export function importPOIs(file: File): Promise<ApiResponse<POI[]>> {
  const formData = new FormData()

  formData.append('file', file)

  return postFormApi<ApiResponse<POI[]>>(
    apiConfig.endpoints.pois_import,
    formData,
  )
}

// GET /pois/export - Export POIs as xlsx
export async function exportPOIs(search?: string): Promise<Blob> {
  const params = new URLSearchParams()
  if (search)
    params.set('search', search)

  const queryString = params.toString()
  const url = `${apiConfig.baseUrl}${apiConfig.endpoints.pois_export}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}
