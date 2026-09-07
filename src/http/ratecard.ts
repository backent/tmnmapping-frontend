import { deleteApi, getApi, postApi, postFormApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type {
  BuildingPrice,
  CreateVersionPayload,
  PackagePrice,
  RateCardVersion,
  UpdateVersionPayload,
} from '@/types/ratecard'
import type { ImportResult } from '@/types/advertiser'

async function downloadFile(endpoint: string): Promise<Blob> {
  const response = await fetch(`${apiConfig.baseUrl}${endpoint}`, {
    method: 'GET',
    credentials: 'include',
  })

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
// Versions
// ---------------------------------------------------------------------------

export function getRateCardVersions(params?: PaginationParams): Promise<ApiResponse<RateCardVersion[]>> {
  return getApi<ApiResponse<RateCardVersion[]>>(apiConfig.endpoints.rate_cards_list, params || {})
}

export function getRateCardVersionById(id: number): Promise<ApiResponse<RateCardVersion>> {
  return getApi<ApiResponse<RateCardVersion>>(apiConfig.endpoints.rate_cards_get, {}, { id })
}

export function getCurrentRateCard(): Promise<ApiResponse<RateCardVersion>> {
  return getApi<ApiResponse<RateCardVersion>>(apiConfig.endpoints.rate_cards_current, {})
}

export function createRateCardVersion(data: CreateVersionPayload): Promise<ApiResponse<RateCardVersion>> {
  return postApi<ApiResponse<RateCardVersion>>(apiConfig.endpoints.rate_cards_create, data)
}

export function updateRateCardVersion(id: number, data: UpdateVersionPayload): Promise<ApiResponse<RateCardVersion>> {
  return putApi<ApiResponse<RateCardVersion>>(apiConfig.endpoints.rate_cards_update, data, { id })
}

export function deleteRateCardVersion(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(apiConfig.endpoints.rate_cards_delete, {}, { id })
}

export function publishRateCardVersion(id: number): Promise<ApiResponse<RateCardVersion>> {
  return postApi<ApiResponse<RateCardVersion>>(apiConfig.endpoints.rate_cards_publish, {}, { id })
}

// ---------------------------------------------------------------------------
// Building prices
// ---------------------------------------------------------------------------

export function getBuildingPrices(versionId: number, params?: PaginationParams): Promise<ApiResponse<BuildingPrice[]>> {
  return getApi<ApiResponse<BuildingPrice[]>>(
    apiConfig.endpoints.rate_cards_building_prices, params || {}, { id: versionId })
}

export function upsertBuildingPrice(versionId: number, buildingId: number, price: number): Promise<ApiResponse<BuildingPrice>> {
  return putApi<ApiResponse<BuildingPrice>>(
    apiConfig.endpoints.rate_cards_building_prices,
    { building_id: buildingId, price_idr_per_4_weeks: price },
    { id: versionId })
}

export function deleteBuildingPrice(versionId: number, buildingId: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.rate_cards_building_price_delete, {}, { id: versionId, buildingId })
}

export function importBuildingPrices(versionId: number, file: File) {
  return uploadFile(
    apiConfig.endpoints.rate_cards_building_prices_import.replace(':id', String(versionId)), file)
}

export function exportBuildingPrices(versionId: number) {
  return downloadFile(apiConfig.endpoints.rate_cards_building_prices_export.replace(':id', String(versionId)))
}

export function downloadBuildingPriceTemplate() {
  return downloadFile(apiConfig.endpoints.rate_cards_building_prices_template)
}

// ---------------------------------------------------------------------------
// Package prices
// ---------------------------------------------------------------------------

export function getPackagePrices(versionId: number, params?: PaginationParams): Promise<ApiResponse<PackagePrice[]>> {
  return getApi<ApiResponse<PackagePrice[]>>(
    apiConfig.endpoints.rate_cards_package_prices, params || {}, { id: versionId })
}

export function upsertPackagePrice(versionId: number, packageId: number, price: number): Promise<ApiResponse<PackagePrice>> {
  return putApi<ApiResponse<PackagePrice>>(
    apiConfig.endpoints.rate_cards_package_prices,
    { sales_package_id: packageId, price_idr_per_4_weeks: price },
    { id: versionId })
}

export function deletePackagePrice(versionId: number, packageId: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.rate_cards_package_price_delete, {}, { id: versionId, packageId })
}

export function importPackagePrices(versionId: number, file: File) {
  return uploadFile(
    apiConfig.endpoints.rate_cards_package_prices_import.replace(':id', String(versionId)), file)
}

export function exportPackagePrices(versionId: number) {
  return downloadFile(apiConfig.endpoints.rate_cards_package_prices_export.replace(':id', String(versionId)))
}

export function downloadPackagePriceTemplate() {
  return downloadFile(apiConfig.endpoints.rate_cards_package_prices_template)
}
