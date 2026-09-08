/**
 * Quotations.
 *
 * The client sends WHAT was selected, never what it costs. Every price comes back
 * from the server, resolved against the published rate card, so the figure shown
 * here is always the figure that will be charged.
 */

export type QuotationStatus =
  | 'draft'
  | 'pending_manager'
  | 'pending_business_control'
  | 'pending_ceo'
  | 'returned'
  | 'approved'

export type SelectionKind = 'placement' | 'bonus'
export type SelectionMode = 'building' | 'package'

export interface SelectionPayload {
  mode: SelectionMode
  building_ids?: number[]
  sales_package_id?: number
  tvc_duration_seconds: number
  weeks: number
  spots: number
}

export interface QuotationPayload {
  sales_owner_user_id?: number
  customer_id: number
  brand_id: number
  attention_to: string
  job_title: string
  contact_phone: string
  contact_email: string
  campaign_year?: number
  valid_until?: string
  discount: number
  tax_rate?: number
  placement?: SelectionPayload | null
  bonus?: SelectionPayload | null
}

export interface SelectionItem {
  building_id: number
  building_name: string
  building_iris_code: string
  building_type: string
  citytown: string
  unit_price_idr: number
  traffic: number
  impressions: number
}

export interface Selection {
  kind: SelectionKind
  mode: SelectionMode
  sales_package_id: number
  sales_package_name: string
  tvc_duration_seconds: number
  weeks: number
  spots: number
  gross_price_per_week: number
  gross_price: number
  traffic: number
  impressions: number
  screen_count: number
  items: SelectionItem[]
}

export interface Pricing {
  placement_gross: number
  placement_discount_amount: number
  placement_net: number
  bonus_gross: number
  bonus_net: number
  total_gross: number
  total_net: number

  /**
   * Includes the value of the free bonus, so it reads higher than the customer
   * discount. Analytics only — it never decides the approver.
   */
  effective_discount_amount: number
  effective_discount_rate: number
  tax: number
  total_including_tax: number
}

/** Who would approve at the current discount, shown before anything is submitted. */
export interface ApprovalHint {
  band: string
  approver_role: string
  approver_name: string
  resolvable: boolean
  reason: string
}

export interface PricingPreview {
  pricing: Pricing
  approval: ApprovalHint
  sections: Selection[]
}

export interface ApprovalEvent {
  version: number
  actor_name: string
  actor_role: string
  action: 'submitted' | 'resubmitted' | 'approved' | 'returned'
  comment: string
  created_at: string
}

export interface Quotation {
  id: number
  quote_number: string
  sales_user_id: number
  sales_name: string
  created_by_name: string
  is_proxy_entry: boolean
  customer_id: number
  customer_name: string
  brand_id: number
  brand_name: string
  rate_card_version_code: string
  attention_to: string
  job_title: string
  contact_phone: string
  contact_email: string
  campaign_year: number
  valid_until: string
  discount: number
  tax_rate: number
  status: QuotationStatus
  is_editable: boolean
  required_approver_name: string
  version: number
  pricing: Pricing
  selections: Selection[]
  approvals: ApprovalEvent[]
  created_at: string
  updated_at: string
  approved_at: string
}

export interface DashboardCounts {
  draft: number
  pending: number
  returned: number
  approved: number
  all: number
}

export const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  draft: 'Draft',
  pending_manager: 'Pending Head of Sales',
  pending_business_control: 'Pending Business Control',
  pending_ceo: 'Pending CEO',
  returned: 'Returned',
  approved: 'Approved',
}

export const QUOTATION_STATUS_COLORS: Record<QuotationStatus, string> = {
  draft: 'secondary',
  pending_manager: 'warning',
  pending_business_control: 'warning',
  pending_ceo: 'warning',
  returned: 'error',
  approved: 'success',
}

export function isPending(status: QuotationStatus): boolean {
  return status === 'pending_manager'
    || status === 'pending_business_control'
    || status === 'pending_ceo'
}

/**
 * Discount band, mirroring the backend's thresholds for display only. The server
 * decides the real routing; this just colours the hint while the seller types.
 */
export function discountBandColor(discount: number): string {
  if (discount <= 65)
    return 'success'
  if (discount <= 75)
    return 'warning'

  return 'error'
}

/** Whole rupiah. The backend rejects fractions, so none are rendered. */
export function formatIdr(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}
