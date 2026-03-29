export interface MotherBrand {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface CreateMotherBrandRequest {
  name: string
}

export interface UpdateMotherBrandRequest {
  name: string
}
