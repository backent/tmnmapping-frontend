export interface POIPoint {
  id: number
  poi_name: string
  address: string
  latitude: number
  longitude: number
  category?: string
  sub_category?: string
  mother_brand?: string
  branch?: string
  created_at?: string
  updated_at?: string
}

export interface POI {
  id: number
  brand: string
  color: string
  points: POIPoint[]
  created_at: string
  updated_at: string
}

export interface CreatePOIRequest {
  brand: string
  color: string
  point_ids: number[]
}

export interface UpdatePOIRequest extends CreatePOIRequest {}
