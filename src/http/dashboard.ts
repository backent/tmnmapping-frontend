import { getApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, QueryParams } from '@/types/api'
import type { DashboardReport, DashboardFilters } from '@/types/dashboard'

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
