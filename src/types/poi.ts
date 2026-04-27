export interface POIPoint {
  id: number
  poi_id?: number
  poi_name: string
  address: string
  latitude: number
  longitude: number
  branch?: string
  branch_id?: number | null
  created_at?: string
  updated_at?: string
}

export interface POIPointInput {
  id?: number | null
  poi_name: string
  address: string
  latitude: number
  longitude: number
  branch_id?: number | null
}

export interface POI {
  id: number
  brand: string
  color: string
  category?: string
  sub_category?: string
  mother_brand?: string
  category_id?: number | null
  sub_category_id?: number | null
  mother_brand_id?: number | null
  points: POIPoint[]
  created_at: string
  updated_at: string
}

export interface CreatePOIRequest {
  brand: string
  color: string
  category_id: number | null
  sub_category_id: number | null
  mother_brand_id: number | null
  points: POIPointInput[]
}

export interface UpdatePOIRequest extends CreatePOIRequest {}
