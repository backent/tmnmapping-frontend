export interface Branch {
  id: number
  name: string
  created_at: string
  updated_at: string
}

export interface CreateBranchRequest {
  name: string
}

export interface UpdateBranchRequest {
  name: string
}
