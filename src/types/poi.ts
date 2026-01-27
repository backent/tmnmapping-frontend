export interface POIPoint {
  id?: number
  place_name: string
  address: string
  latitude: number
  longitude: number
  created_at?: string
}

export interface POI {
  id: number
  name: string
  color: string
  points: POIPoint[]
  created_at: string
  updated_at: string
}

export interface CreatePOIRequest {
  name: string
  color: string
  points: Array<{
    place_name: string
    address: string
    latitude: number
    longitude: number
  }>
}

export interface UpdatePOIRequest extends CreatePOIRequest {}
