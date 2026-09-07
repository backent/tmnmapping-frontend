/**
 * The advertising rate card: what an advertiser pays TMN.
 *
 * Every price is a PER-WEEK rate, matching the rate card source spreadsheet. A
 * campaign of N weeks is charged `price × N`. Storing the same period the source
 * document uses means a number here can be checked against the spreadsheet directly.
 */

export type RateCardStatus = 'draft' | 'current' | 'historical'

export interface RateCardVersion {
  id: number
  version_code: string
  description: string
  currency: string
  status: RateCardStatus

  /** Only a draft can be changed. Publishing freezes a version for good. */
  is_editable: boolean
  published_by_user_id: number
  published_by_name: string
  published_at: string
  building_price_count: number
  package_price_count: number
  created_at: string
  updated_at: string
}

export interface CreateVersionPayload {
  version_code: string
  description: string
  currency: string

  /** Seeds the new draft from an existing version instead of a blank sheet. */
  copy_from_version_id?: number
}

export interface UpdateVersionPayload {
  version_code: string
  description: string
  currency: string
}

export interface BuildingPrice {
  id: number
  rate_card_version_id: number
  building_id: number
  building_name: string
  building_iris_code: string
  building_type: string
  citytown: string
  price_idr_per_week: number
  created_at: string
  updated_at: string
}

export interface PackagePrice {
  id: number
  rate_card_version_id: number
  sales_package_id: number
  sales_package_name: string
  price_idr_per_week: number
  building_count: number
  created_at: string
  updated_at: string
}

export const RATE_CARD_STATUS_LABELS: Record<RateCardStatus, string> = {
  draft: 'Draft',
  current: 'Current',
  historical: 'Historical',
}

export const RATE_CARD_STATUS_COLORS: Record<RateCardStatus, string> = {
  draft: 'warning',
  current: 'success',
  historical: 'secondary',
}

/** Whole rupiah, grouped. No minor unit — the backend rejects fractions. */
export function formatIdr(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}
