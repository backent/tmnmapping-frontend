import { getApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, QueryParams } from '@/types/api'
import type { DashboardReport, DashboardFilters, LCDPresenceSummaryResponse } from '@/types/dashboard'

export function getAcquisitionReport(filters?: Partial<DashboardFilters>): Promise<ApiResponse<DashboardReport>> {
  return getApi<ApiResponse<DashboardReport>>(
    apiConfig.endpoints.dashboard_acquisition,
    (filters || {}) as QueryParams,
  )
}

export function getBuildingProposalReport(filters?: Partial<DashboardFilters>): Promise<ApiResponse<DashboardReport>> {
  return getApi<ApiResponse<DashboardReport>>(
    apiConfig.endpoints.dashboard_building_proposal,
    (filters || {}) as QueryParams,
  )
}

export function getLOIReport(filters?: Partial<DashboardFilters>): Promise<ApiResponse<DashboardReport>> {
  return getApi<ApiResponse<DashboardReport>>(
    apiConfig.endpoints.dashboard_loi,
    (filters || {}) as QueryParams,
  )
}

export function getBuildingLCDPresenceSummary(): Promise<ApiResponse<LCDPresenceSummaryResponse>> {
  return getApi<ApiResponse<LCDPresenceSummaryResponse>>(
    apiConfig.endpoints.dashboard_building_lcd_presence,
  )
}
