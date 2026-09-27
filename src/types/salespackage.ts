export interface BuildingRef {
  id: number
  name: string
  project_name: string
  subdistrict: string
  citytown: string
  province: string
  building_type: string
}

export type SalesPackageStatus = 'active' | 'inactive'

export const SALES_PACKAGE_STATUS_OPTIONS: { title: string; value: SalesPackageStatus }[] = [
  { title: 'Active', value: 'active' },
  { title: 'Inactive', value: 'inactive' },
]

export interface SalesPackage {
  id: number
  package_code: string
  name: string
  description: string
  status: SalesPackageStatus

  // Set independently, not summed from the member buildings: a package is a priced
  // resource in its own right, and the quotation copies these onto the selection.
  screen_count: number
  traffic: number
  impressions: number

  /** What the advertiser pays for one week of the whole package. */
  price_idr_per_week: number

  buildings: BuildingRef[]
  created_at: string
  updated_at: string
}

export interface CreateSalesPackageRequest {
  package_code: string
  name: string
  description: string
  status: SalesPackageStatus
  screen_count: number
  traffic: number
  impressions: number
  price_idr_per_week: number
  building_ids: number[]
}

export interface UpdateSalesPackageRequest extends CreateSalesPackageRequest {}
