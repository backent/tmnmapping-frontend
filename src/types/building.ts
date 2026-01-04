export interface Building {
  id: number
  name: string
  iris_building_id?: string | null
  external_building_id?: string | null
  project_name?: string | null
  resource_type_id?: number | null
  resource_type_name?: string | null
  audience?: number | null
  traffic_per_week?: number | null
  address: string
  latitude: number | null
  longitude: number | null
  description: string
  building_area_id: number
  building_sub_area_id: number
  building_type_id: number
  package_id?: number | null
  package_name?: string | null
  created_by?: number
  created_at?: string
  updated_at?: string
}

export interface BuildingImportData {
  name: string
  address: string
  building_area: string
  building_sub_area: string
  building_type: string
  iris_building_id?: string | null
  external_building_id?: string | null
  project_name?: string | null
  resource_type_id?: number | null
  resource_type?: string | null
  audience?: number | null
  traffic_per_week?: number | null
  latitude?: number | null
  longitude?: number | null
  description?: string
}

export interface BuildingScreenAvailable {
  building_id: number
  screen_type: 'inside' | 'outside'
  building: Building
}

