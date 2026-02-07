export interface SavedPolygonPoint {
  ord: number
  lat: number
  lng: number
}

export interface SavedPolygon {
  id: number
  name: string
  points: SavedPolygonPoint[]
  created_at: string
  updated_at: string
}

export interface CreateSavedPolygonRequest {
  name: string
  points: Array<{ lat: number; lng: number }>
}

export interface UpdateSavedPolygonRequest extends CreateSavedPolygonRequest {}
