/**
 * Advertiser master data HTTP clients: customers, brands and sales assignments.
 *
 * Each entity offers the same three file operations — download a blank template,
 * upload a filled one, export what is stored. Export reuses the template's headers,
 * so an exported file can be edited and uploaded straight back.
 */

import { deleteApi, getApi, postApi, postFormApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type {
  Brand,
  BrandPayload,
  Customer,
  CustomerPayload,
  ImportResult,
  SalesAssignment,
  SalesAssignmentPayload,
} from '@/types/advertiser'

// ---------------------------------------------------------------------------
// Shared file helpers
// ---------------------------------------------------------------------------

async function downloadFile(endpoint: string, params?: Record<string, string>): Promise<Blob> {
  const query = new URLSearchParams(params ?? {}).toString()
  const url = `${apiConfig.baseUrl}${endpoint}${query ? `?${query}` : ''}`

  const response = await fetch(url, { method: 'GET', credentials: 'include' })

  if (!response.ok)
    throw new Error(`HTTP error! Status: ${response.status}`)

  return response.blob()
}

function uploadFile(endpoint: string, file: File): Promise<ApiResponse<ImportResult>> {
  const formData = new FormData()

  formData.append('file', file)

  return postFormApi<ApiResponse<ImportResult>>(endpoint, formData)
}

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export function getCustomers(params?: PaginationParams): Promise<ApiResponse<Customer[]>> {
  return getApi<ApiResponse<Customer[]>>(apiConfig.endpoints.customers_list, params || {})
}

export function getCustomerById(id: number): Promise<ApiResponse<Customer>> {
  return getApi<ApiResponse<Customer>>(apiConfig.endpoints.customers_get, {}, { id })
}

export function createCustomer(data: CustomerPayload): Promise<ApiResponse<Customer>> {
  return postApi<ApiResponse<Customer>>(apiConfig.endpoints.customers_create, data)
}

export function updateCustomer(id: number, data: CustomerPayload): Promise<ApiResponse<Customer>> {
  return putApi<ApiResponse<Customer>>(apiConfig.endpoints.customers_update, data, { id })
}

export function deleteCustomer(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(apiConfig.endpoints.customers_delete, {}, { id })
}

export function importCustomers(file: File) {
  return uploadFile(apiConfig.endpoints.customers_import, file)
}

export function exportCustomers(search?: string) {
  return downloadFile(apiConfig.endpoints.customers_export, search ? { search } : undefined)
}

export function downloadCustomerTemplate() {
  return downloadFile(apiConfig.endpoints.customers_template)
}

// ---------------------------------------------------------------------------
// Brands
// ---------------------------------------------------------------------------

export function getBrands(params?: PaginationParams & { customer_id?: number }): Promise<ApiResponse<Brand[]>> {
  return getApi<ApiResponse<Brand[]>>(apiConfig.endpoints.brands_list, params || {})
}

export function getBrandById(id: number): Promise<ApiResponse<Brand>> {
  return getApi<ApiResponse<Brand>>(apiConfig.endpoints.brands_get, {}, { id })
}

export function createBrand(data: BrandPayload): Promise<ApiResponse<Brand>> {
  return postApi<ApiResponse<Brand>>(apiConfig.endpoints.brands_create, data)
}

export function updateBrand(id: number, data: BrandPayload): Promise<ApiResponse<Brand>> {
  return putApi<ApiResponse<Brand>>(apiConfig.endpoints.brands_update, data, { id })
}

export function deleteBrand(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(apiConfig.endpoints.brands_delete, {}, { id })
}

export function importBrands(file: File) {
  return uploadFile(apiConfig.endpoints.brands_import, file)
}

export function exportBrands(search?: string) {
  return downloadFile(apiConfig.endpoints.brands_export, search ? { search } : undefined)
}

export function downloadBrandTemplate() {
  return downloadFile(apiConfig.endpoints.brands_template)
}

// ---------------------------------------------------------------------------
// Sales assignments
// ---------------------------------------------------------------------------

export function getSalesAssignments(params?: PaginationParams): Promise<ApiResponse<SalesAssignment[]>> {
  return getApi<ApiResponse<SalesAssignment[]>>(apiConfig.endpoints.sales_assignments_list, params || {})
}

export function getSalesAssignmentById(id: number): Promise<ApiResponse<SalesAssignment>> {
  return getApi<ApiResponse<SalesAssignment>>(apiConfig.endpoints.sales_assignments_get, {}, { id })
}

export function createSalesAssignment(data: SalesAssignmentPayload): Promise<ApiResponse<SalesAssignment>> {
  return postApi<ApiResponse<SalesAssignment>>(apiConfig.endpoints.sales_assignments_create, data)
}

export function updateSalesAssignment(id: number, data: SalesAssignmentPayload): Promise<ApiResponse<SalesAssignment>> {
  return putApi<ApiResponse<SalesAssignment>>(apiConfig.endpoints.sales_assignments_update, data, { id })
}

export function deleteSalesAssignment(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(apiConfig.endpoints.sales_assignments_delete, {}, { id })
}

export function importSalesAssignments(file: File) {
  return uploadFile(apiConfig.endpoints.sales_assignments_import, file)
}

export function exportSalesAssignments(search?: string) {
  return downloadFile(apiConfig.endpoints.sales_assignments_export, search ? { search } : undefined)
}

export function downloadSalesAssignmentTemplate() {
  return downloadFile(apiConfig.endpoints.sales_assignments_template)
}
