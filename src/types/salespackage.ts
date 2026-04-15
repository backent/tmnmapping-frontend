export interface BuildingRef {
  id: number
  name: string
  project_name: string
  subdistrict: string
  citytown: string
  province: string
  building_type: string
}

export interface SalesPackage {
  id: number
  name: string
  buildings: BuildingRef[]
  created_at: string
  updated_at: string
}

export interface CreateSalesPackageRequest {
  name: string
  building_ids: number[]
}

export interface UpdateSalesPackageRequest extends CreateSalesPackageRequest {}
