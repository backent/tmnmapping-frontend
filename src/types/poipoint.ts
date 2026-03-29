export interface POIRef {
  id: number
  brand: string
}

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
  pois: POIRef[]
  created_at: string
  updated_at: string
}

export interface CreatePOIPointRequest {
  poi_name: string
  address: string
  latitude: number
  longitude: number
  category?: string
  sub_category?: string
  mother_brand?: string
  branch?: string
}

export interface UpdatePOIPointRequest extends CreatePOIPointRequest {}

export interface POIPointUsageResponse {
  pois: POIRef[]
}
