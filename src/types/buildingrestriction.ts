export interface BuildingRef {
  id: number
  name: string
  project_name: string
  subdistrict: string
  citytown: string
  province: string
  building_type: string
}

export interface BuildingRestriction {
  id: number
  name: string
  buildings: BuildingRef[]
  created_at: string
  updated_at: string
}

export interface CreateBuildingRestrictionRequest {
  name: string
  building_ids: number[]
}

export interface UpdateBuildingRestrictionRequest extends CreateBuildingRestrictionRequest {}
