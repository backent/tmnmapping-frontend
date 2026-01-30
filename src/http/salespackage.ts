import { getApi, postApi, putApi, deleteApi } from '@/utils/http'
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
