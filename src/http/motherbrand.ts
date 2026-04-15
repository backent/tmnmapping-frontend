import { deleteApi, getApi, postApi, postFormApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { CreateMotherBrandRequest, MotherBrand, UpdateMotherBrandRequest } from '@/types/motherbrand'

export function getMotherBrands(params?: PaginationParams): Promise<ApiResponse<MotherBrand[]>> {
  return getApi<ApiResponse<MotherBrand[]>>(
    apiConfig.endpoints.mother_brands_list,
    params || {},
  )
}

export function getMotherBrandById(id: number): Promise<ApiResponse<MotherBrand>> {
  return getApi<ApiResponse<MotherBrand>>(
    apiConfig.endpoints.mother_brands_get,
    {},
    { id },
  )
}

export function createMotherBrand(data: CreateMotherBrandRequest): Promise<ApiResponse<MotherBrand>> {
  return postApi<ApiResponse<MotherBrand>>(
    apiConfig.endpoints.mother_brands_create,
    data,
  )
}

export function updateMotherBrand(id: number, data: UpdateMotherBrandRequest): Promise<ApiResponse<MotherBrand>> {
  return putApi<ApiResponse<MotherBrand>>(
    apiConfig.endpoints.mother_brands_update,
    data,
    { id },
  )
}

export function deleteMotherBrand(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.mother_brands_delete,
    {},
    { id },
  )
}

export function getMotherBrandsDropdown(): Promise<ApiResponse<MotherBrand[]>> {
  return getApi<ApiResponse<MotherBrand[]>>(
    apiConfig.endpoints.mother_brands_dropdown,
    {},
  )
}

export function importMotherBrands(file: File): Promise<ApiResponse<MotherBrand[]>> {
  const formData = new FormData()

  formData.append('file', file)

  return postFormApi<ApiResponse<MotherBrand[]>>(
    apiConfig.endpoints.mother_brands_import,
    formData,
  )
}

export async function exportMotherBrands(search?: string): Promise<Blob> {
  const params = new URLSearchParams()
  if (search)
    params.set('search', search)

  const queryString = params.toString()
  const url = `${apiConfig.baseUrl}${apiConfig.endpoints.mother_brands_export}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}
