/**
 * Advertiser master data: the customers and brands a quotation is raised for.
 *
 * Unrelated to `mother_brands`, which is the retail/competitor concept used by the
 * POI map layer.
 */

export type MasterDataStatus = 'active' | 'inactive'

export interface Customer {
  id: number
  code: string
  name: string
  industry: string
  status: MasterDataStatus
  created_at: string
  updated_at: string
}

export interface CustomerPayload {
  code: string
  name: string
  industry: string
  status: MasterDataStatus
}

export interface Brand {
  id: number
  code: string
  customer_id: number
  customer_code: string
  customer_name: string
  name: string
  category: string
  status: MasterDataStatus
  created_at: string
  updated_at: string
}

export interface BrandPayload {
  code: string
  customer_id: number
  name: string
  category: string
  status: MasterDataStatus
}

export interface SalesAssignment {
  id: number
  customer_id: number
  customer_code: string
  customer_name: string
  brand_id: number
  brand_code: string
  brand_name: string
  sales_user_id: number
  sales_username: string
  sales_name: string
  status: MasterDataStatus
  registration_date: string
  expiry_date: string
  created_at: string
  updated_at: string
}

export interface SalesAssignmentPayload {
  customer_id: number
  brand_id: number
  sales_user_id: number
  status: MasterDataStatus
  registration_date: string
  expiry_date: string
}

/** One rejected spreadsheet row. `row` is the number shown in Excel. */
export interface ImportError {
  row: number
  column: string
  value: string
  message: string
}

/**
 * Outcome of an upload. Imports are all-or-nothing, so `imported: false` always
 * means nothing was written and `errors` explains why.
 */
export interface ImportResult {
  rows: number
  created: number
  updated: number
  imported: boolean
  errors: ImportError[]

  /** Valid rows deliberately not applied, e.g. a price of 0. */
  skipped?: number

  /** Rows that already matched. Reported by previews. */
  unchanged?: number

  /** A preview: every row was checked and counted, nothing written. */
  dry_run?: boolean
}

export const STATUS_OPTIONS: { title: string; value: MasterDataStatus }[] = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
]
