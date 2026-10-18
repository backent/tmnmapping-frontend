import { deleteApi, getApi, postApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type {
  DashboardCounts,
  PricingPreview,
  Quotation,
  QuotationPayload,
  SelectionPayload,
} from '@/types/quotation'

export interface QuotationListParams extends PaginationParams {
  status?: string
  /** Only quotations this user commercially owns. */
  mine?: boolean
  /** Only quotations waiting on this user's approval. */
  awaiting_me?: boolean
  search?: string
}

export function getQuotations(params?: QuotationListParams): Promise<ApiResponse<Quotation[]>> {
  return getApi<ApiResponse<Quotation[]>>(apiConfig.endpoints.quotations_list, params || {})
}

export function getQuotationById(id: number): Promise<ApiResponse<Quotation>> {
  return getApi<ApiResponse<Quotation>>(apiConfig.endpoints.quotations_get, {}, { id })
}

export function createQuotation(data: QuotationPayload): Promise<ApiResponse<Quotation>> {
  return postApi<ApiResponse<Quotation>>(apiConfig.endpoints.quotations_create, data)
}

export function updateQuotation(id: number, data: QuotationPayload): Promise<ApiResponse<Quotation>> {
  return putApi<ApiResponse<Quotation>>(apiConfig.endpoints.quotations_update, data, { id })
}

export function deleteQuotation(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(apiConfig.endpoints.quotations_delete, {}, { id })
}

export function submitQuotation(id: number): Promise<ApiResponse<Quotation>> {
  return postApi<ApiResponse<Quotation>>(apiConfig.endpoints.quotations_submit, {}, { id })
}

export function approveQuotation(id: number): Promise<ApiResponse<Quotation>> {
  return postApi<ApiResponse<Quotation>>(apiConfig.endpoints.quotations_approve, {}, { id })
}

/** The comment is mandatory; the server refuses a blank one. */
export function returnQuotation(id: number, comment: string): Promise<ApiResponse<Quotation>> {
  return postApi<ApiResponse<Quotation>>(apiConfig.endpoints.quotations_return, { comment }, { id })
}

/**
 * Live pricing for the wizard. Runs the same functions submit will, so what the
 * seller sees is what they get.
 */
export function previewPricing(payload: {
  discount: number
  tax_rate?: number
  placement?: SelectionPayload | null
  bonus?: SelectionPayload | null
}): Promise<ApiResponse<PricingPreview>> {
  return postApi<ApiResponse<PricingPreview>>(apiConfig.endpoints.quotations_pricing_preview, payload)
}

export function getDashboardCounts(): Promise<ApiResponse<DashboardCounts>> {
  return getApi<ApiResponse<DashboardCounts>>(apiConfig.endpoints.quotations_dashboard, {})
}
