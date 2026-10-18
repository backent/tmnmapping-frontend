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

/** One selection, summarised for a list row, which does not load the selections. */
export interface CampaignLine {
  kind: SelectionKind
  mode: SelectionMode
  package_name: string
  building_count: number
  weeks: number
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

  /** Set on list rows, in place of the selections they do not load. */
  campaign?: CampaignLine[]
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

  /** Waiting on this user's approval, whoever owns them. Absent from older backends. */
  awaiting_me?: number
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
 * The list filter for "with an approver", whichever one. The server expands it to all
 * three pending statuses; no quotation has this as its status.
 */
export const PENDING_STATUS_FILTER = 'pending'

/**
 * Who a pending quotation is waiting on, for the pricing card's approval strip.
 *
 * The status already records which band routing chose, so the band is read from it
 * rather than guessed from the discount: the thresholds are configurable on the
 * server, and an approved or returned quotation has no current approver at all, so
 * those get no strip.
 */
export function approvalHintFor(
  quotation: Pick<Quotation, 'status' | 'required_approver_name'>,
): ApprovalHint | null {
  const route = ({
    pending_manager: { band: 'standard', approver_role: 'head_of_sales' },
    pending_business_control: { band: 'elevated', approver_role: 'head_of_business_control' },
    pending_ceo: { band: 'executive', approver_role: 'ceo' },
  } as Partial<Record<QuotationStatus, { band: string; approver_role: string }>>)[quotation.status]

  if (!route)
    return null

  return {
    ...route,
    approver_name: quotation.required_approver_name,
    resolvable: true,
    reason: '',
  }
}

/** A stored selection as the API takes it back, for editing or for a preview. */
export function selectionPayloadFrom(selection: Selection): SelectionPayload {
  return {
    mode: selection.mode,
    building_ids: selection.items.map(i => i.building_id),
    sales_package_id: selection.sales_package_id,
    tvc_duration_seconds: selection.tvc_duration_seconds,
    weeks: selection.weeks,
    spots: selection.spots,
  }
}

function describeLine(line: CampaignLine): string {
  if (line.mode === 'package')
    return line.package_name ? `Package: ${line.package_name}` : 'Package'

  return `${line.building_count} building${line.building_count === 1 ? '' : 's'}`
}

/**
 * The Campaign cell of a list row: the placement and its weeks, then the bonus.
 *
 * Only the placement's weeks are shown on the first line. Bonus weeks run alongside
 * it, and adding them up would read as a longer campaign than was sold.
 */
export function campaignSummary(lines: CampaignLine[] | undefined): { main: string; sub: string } {
  const placement = lines?.find(l => l.kind === 'placement')
  const bonus = lines?.find(l => l.kind === 'bonus')

  if (!placement)
    return { main: 'Nothing selected yet', sub: bonus ? `+ bonus ${describeLine(bonus)}` : '' }

  return {
    main: `${describeLine(placement)} · ${placement.weeks} wk`,
    sub: bonus ? `+ bonus ${describeLine(bonus)}` : 'No bonus',
  }
}

/**
 * Whether the stored figures are real yet.
 *
 * Pricing is written on submit, not on save, so a draft's totals are all zero. A
 * returned quotation keeps the figures it was submitted with.
 */
export function isUnpriced(status: QuotationStatus): boolean {
  return status === 'draft'
}

/**
 * The backend's default discount thresholds (QUOTATION_DISCOUNT_THRESHOLD_*), for
 * display only: they colour and label hints while the seller types. The server
 * decides the real routing and can be configured differently, which is why the
 * approver itself is always taken from the server's preview, never from these.
 */
export const DISCOUNT_THRESHOLDS = { standard: 65, elevated: 75 } as const

export function discountBandColor(discount: number): string {
  if (discount <= DISCOUNT_THRESHOLDS.standard)
    return 'success'
  if (discount <= DISCOUNT_THRESHOLDS.elevated)
    return 'warning'

  return 'error'
}

/** How each approval band reads, with its range in words so colour is never the only signal. */
export const APPROVAL_BANDS: Record<string, { label: string; range: string; color: string }> = {
  standard: { label: 'Standard approval', range: `up to ${DISCOUNT_THRESHOLDS.standard}%`, color: 'success' },
  elevated: {
    label: 'Elevated approval',
    range: `${DISCOUNT_THRESHOLDS.standard} to ${DISCOUNT_THRESHOLDS.elevated}%`,
    color: 'warning',
  },
  executive: { label: 'Executive approval', range: `above ${DISCOUNT_THRESHOLDS.elevated}%`, color: 'error' },
}

export const APPROVER_ROLE_LABELS: Record<string, string> = {
  head_of_sales: 'Head of Sales',
  head_of_business_control: 'Head of Business Control',
  ceo: 'CEO',
}

/** "Rp 420,2 jt": short enough for a phone's pricing bar. The full figure is a tap away. */
export function formatIdrCompact(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value || 0)
}

/** Whole rupiah. The backend rejects fractions, so none are rendered. */
export function formatIdr(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value || 0)
}
