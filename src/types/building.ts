// Image interface
export interface BuildingImage {
  name: string
  path: string
}

// Entity interface matching backend response
export interface Building {
  id: number
  external_building_id: string
  iris_code: string
  name: string
  project_name: string
  audience: number
  impression: number
  cbd_area: string
  building_status: string
  competitor_location: boolean
  sellable: string
  connectivity: string
  resource_type: string
  subdistrict: string
  citytown: string
  province: string
  grade_resource: string
  images: BuildingImage[]
  synced_at: string
  created_at: string
  updated_at: string
}

// Update request data (only user-editable fields)
export interface BuildingUpdateData {
  sellable?: string
  connectivity?: string
  resource_type?: string
}

// Pagination parameters for API requests
export interface PaginationParams {
  take?: number
  skip?: number
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
  search?: string
  building_status?: string
  sellable?: string
  connectivity?: string
  resource_type?: string
  competitor_location?: boolean
  cbd_area?: string
  subdistrict?: string
  citytown?: string
  province?: string
  grade_resource?: string
}

// Filter options from backend
export interface FilterOptions {
  building_status: string[]
  sellable: string[]
  connectivity: string[]
  resource_type: string[]
  cbd_area: string[]
  subdistrict: string[]
  citytown: string[]
  province: string[]
  grade_resource: string[]
}
