import { deleteApi, getApi, postFormApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse } from '@/types/api'
import type { BuildingPrice } from '@/types/buildingprice'
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

export function getBuildingPrices(params: Record<string, string | number> = {}): Promise<ApiResponse<BuildingPrice[]>> {
  return getApi<ApiResponse<BuildingPrice[]>>(apiConfig.endpoints.building_prices, params)
}

/** Every price, for screens that look buildings up by id. */
export function getAllBuildingPrices(): Promise<ApiResponse<BuildingPrice[]>> {
  return getBuildingPrices({ take: 100000, skip: 0 })
}

export function upsertBuildingPrice(buildingId: number, price: number): Promise<ApiResponse<BuildingPrice>> {
  return putApi<ApiResponse<BuildingPrice>>(apiConfig.endpoints.building_prices, {
    building_id: buildingId,
    price_idr_per_week: price,
  })
}

export function deleteBuildingPrice(buildingId: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.building_price_delete.replace(':buildingId', String(buildingId)))
}

/** With dryRun the file is checked and counted but nothing is written. */
export function importBuildingPrices(file: File, dryRun: boolean): Promise<ApiResponse<ImportResult>> {
  const formData = new FormData()

  formData.append('file', file)

  return postFormApi<ApiResponse<ImportResult>>(
    `${apiConfig.endpoints.building_prices_import}?dry_run=${dryRun}`, formData)
}

export function exportBuildingPrices(): Promise<Blob> {
  return downloadFile(apiConfig.endpoints.building_prices_export)
}

export function downloadBuildingPriceTemplate(): Promise<Blob> {
  return downloadFile(apiConfig.endpoints.building_prices_template)
}
