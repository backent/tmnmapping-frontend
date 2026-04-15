import { deleteApi, getApi, postApi, postFormApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { CreateSubCategoryRequest, SubCategory, UpdateSubCategoryRequest } from '@/types/subcategory'

export function getSubCategories(params?: PaginationParams): Promise<ApiResponse<SubCategory[]>> {
  return getApi<ApiResponse<SubCategory[]>>(
    apiConfig.endpoints.sub_categories_list,
    params || {},
  )
}

export function getSubCategoryById(id: number): Promise<ApiResponse<SubCategory>> {
  return getApi<ApiResponse<SubCategory>>(
    apiConfig.endpoints.sub_categories_get,
    {},
    { id },
  )
}

export function createSubCategory(data: CreateSubCategoryRequest): Promise<ApiResponse<SubCategory>> {
  return postApi<ApiResponse<SubCategory>>(
    apiConfig.endpoints.sub_categories_create,
    data,
  )
}

export function updateSubCategory(id: number, data: UpdateSubCategoryRequest): Promise<ApiResponse<SubCategory>> {
  return putApi<ApiResponse<SubCategory>>(
    apiConfig.endpoints.sub_categories_update,
    data,
    { id },
  )
}

export function deleteSubCategory(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.sub_categories_delete,
    {},
    { id },
  )
}

export function getSubCategoriesDropdown(): Promise<ApiResponse<SubCategory[]>> {
  return getApi<ApiResponse<SubCategory[]>>(
    apiConfig.endpoints.sub_categories_dropdown,
    {},
  )
}

export function importSubCategories(file: File): Promise<ApiResponse<SubCategory[]>> {
  const formData = new FormData()

  formData.append('file', file)

  return postFormApi<ApiResponse<SubCategory[]>>(
    apiConfig.endpoints.sub_categories_import,
    formData,
  )
}

export async function exportSubCategories(search?: string): Promise<Blob> {
  const params = new URLSearchParams()
  if (search)
    params.set('search', search)

  const queryString = params.toString()
  const url = `${apiConfig.baseUrl}${apiConfig.endpoints.sub_categories_export}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}
