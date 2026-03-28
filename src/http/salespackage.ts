import { getApi, postApi, putApi, deleteApi, postFormApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { SalesPackage, CreateSalesPackageRequest, UpdateSalesPackageRequest } from '@/types/salespackage'

export function getSalesPackages(params?: PaginationParams): Promise<ApiResponse<SalesPackage[]>> {
  return getApi<ApiResponse<SalesPackage[]>>(
    apiConfig.endpoints.sales_packages_list,
    params || {},
  )
}

export function getSalesPackageById(id: number): Promise<ApiResponse<SalesPackage>> {
  return getApi<ApiResponse<SalesPackage>>(
    apiConfig.endpoints.sales_packages_get,
    {},
    { id },
  )
}

export function createSalesPackage(data: CreateSalesPackageRequest): Promise<ApiResponse<SalesPackage>> {
  return postApi<ApiResponse<SalesPackage>>(
    apiConfig.endpoints.sales_packages_create,
    data,
  )
}

export function updateSalesPackage(id: number, data: UpdateSalesPackageRequest): Promise<ApiResponse<SalesPackage>> {
  return putApi<ApiResponse<SalesPackage>>(
    apiConfig.endpoints.sales_packages_update,
    data,
    { id },
  )
}

export function deleteSalesPackage(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.sales_packages_delete,
    {},
    { id },
  )
}

export function importSalesPackages(file: File): Promise<ApiResponse<SalesPackage[]>> {
  const formData = new FormData()
  formData.append('file', file)
  return postFormApi<ApiResponse<SalesPackage[]>>(
    apiConfig.endpoints.sales_packages_import,
    formData,
  )
}

export async function exportSalesPackages(search?: string): Promise<Blob> {
  const params = new URLSearchParams()
  if (search)
    params.set('search', search)

  const queryString = params.toString()
  const url = `${apiConfig.baseUrl}${apiConfig.endpoints.sales_packages_export}${queryString ? `?${queryString}` : ''}`

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}
