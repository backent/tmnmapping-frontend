import { getApi, postApi, putApi, deleteApi, postFormApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { Branch, CreateBranchRequest, UpdateBranchRequest } from '@/types/branch'

export function getBranches(params?: PaginationParams): Promise<ApiResponse<Branch[]>> {
  return getApi<ApiResponse<Branch[]>>(
    apiConfig.endpoints.branches_list,
    params || {},
  )
}

export function getBranchById(id: number): Promise<ApiResponse<Branch>> {
  return getApi<ApiResponse<Branch>>(
    apiConfig.endpoints.branches_get,
    {},
    { id },
  )
}

export function createBranch(data: CreateBranchRequest): Promise<ApiResponse<Branch>> {
  return postApi<ApiResponse<Branch>>(
    apiConfig.endpoints.branches_create,
    data,
  )
}

export function updateBranch(id: number, data: UpdateBranchRequest): Promise<ApiResponse<Branch>> {
  return putApi<ApiResponse<Branch>>(
    apiConfig.endpoints.branches_update,
    data,
    { id },
  )
}

export function deleteBranch(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.branches_delete,
    {},
    { id },
  )
}

export function getBranchesDropdown(): Promise<ApiResponse<Branch[]>> {
  return getApi<ApiResponse<Branch[]>>(
    apiConfig.endpoints.branches_dropdown,
    {},
  )
}

export function importBranches(file: File): Promise<ApiResponse<Branch[]>> {
  const formData = new FormData()
  formData.append('file', file)
  return postFormApi<ApiResponse<Branch[]>>(
    apiConfig.endpoints.branches_import,
    formData,
  )
}

export async function exportBranches(search?: string): Promise<Blob> {
  const params = new URLSearchParams()
  if (search)
    params.set('search', search)

  const queryString = params.toString()
  const url = `${apiConfig.baseUrl}${apiConfig.endpoints.branches_export}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}
