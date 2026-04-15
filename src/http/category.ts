import { deleteApi, getApi, postApi, postFormApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from '@/types/category'

export function getCategories(params?: PaginationParams): Promise<ApiResponse<Category[]>> {
  return getApi<ApiResponse<Category[]>>(
    apiConfig.endpoints.categories_list,
    params || {},
  )
}

export function getCategoryById(id: number): Promise<ApiResponse<Category>> {
  return getApi<ApiResponse<Category>>(
    apiConfig.endpoints.categories_get,
    {},
    { id },
  )
}

export function createCategory(data: CreateCategoryRequest): Promise<ApiResponse<Category>> {
  return postApi<ApiResponse<Category>>(
    apiConfig.endpoints.categories_create,
    data,
  )
}

export function updateCategory(id: number, data: UpdateCategoryRequest): Promise<ApiResponse<Category>> {
  return putApi<ApiResponse<Category>>(
    apiConfig.endpoints.categories_update,
    data,
    { id },
  )
}

export function deleteCategory(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.categories_delete,
    {},
    { id },
  )
}

export function getCategoriesDropdown(): Promise<ApiResponse<Category[]>> {
  return getApi<ApiResponse<Category[]>>(
    apiConfig.endpoints.categories_dropdown,
    {},
  )
}

export function importCategories(file: File): Promise<ApiResponse<Category[]>> {
  const formData = new FormData()

  formData.append('file', file)

  return postFormApi<ApiResponse<Category[]>>(
    apiConfig.endpoints.categories_import,
    formData,
  )
}

export async function exportCategories(search?: string): Promise<Blob> {
  const params = new URLSearchParams()
  if (search)
    params.set('search', search)

  const queryString = params.toString()
  const url = `${apiConfig.baseUrl}${apiConfig.endpoints.categories_export}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}
