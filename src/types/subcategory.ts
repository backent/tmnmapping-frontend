export interface SubCategory {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface CreateSubCategoryRequest {
  name: string
}

export interface UpdateSubCategoryRequest {
  name: string
}
