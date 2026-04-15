import { getApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, QueryParams } from '@/types/api'
import type { DashboardFilters, DashboardReport, LCDPresenceSummaryResponse } from '@/types/dashboard'

function toQueryParams(filters: Partial<DashboardFilters>): QueryParams {
  return {
    pic: filters.pics || [],
    date_from: filters.date_from || '',
    date_to: filters.date_to || '',
  }
}

export function getAcquisitionReport(filters?: Partial<DashboardFilters>): Promise<ApiResponse<DashboardReport>> {
  return getApi<ApiResponse<DashboardReport>>(
    apiConfig.endpoints.dashboard_acquisition,
    toQueryParams(filters || {}),
  )
}

export function getBuildingProposalReport(filters?: Partial<DashboardFilters>): Promise<ApiResponse<DashboardReport>> {
  return getApi<ApiResponse<DashboardReport>>(
    apiConfig.endpoints.dashboard_building_proposal,
    toQueryParams(filters || {}),
  )
}

export function getLOIReport(filters?: Partial<DashboardFilters>): Promise<ApiResponse<DashboardReport>> {
  return getApi<ApiResponse<DashboardReport>>(
    apiConfig.endpoints.dashboard_loi,
    toQueryParams(filters || {}),
  )
}

export function getBuildingLCDPresenceSummary(): Promise<ApiResponse<LCDPresenceSummaryResponse>> {
  return getApi<ApiResponse<LCDPresenceSummaryResponse>>(
    apiConfig.endpoints.dashboard_building_lcd_presence,
  )
}
