/**
 * Common API response type definitions
 */

export interface ApiResponse<T = any> {
  data: T
  message?: string
  status?: string
  extras?: any
}

export interface PaginatedResponse<T> {
  data: T[]
  meta: {
    current_page: number
    from: number
    last_page: number
    per_page: number
    to: number
    total: number
  }
  links?: {
    first: string
    last: string
    prev: string | null
    next: string | null
  }
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
  status?: number
  statusText?: string
}

export interface PaginationParams {
  [key: string]: string | number | boolean | undefined | null
  page?: number
  limit?: number
  per_page?: number
  take?: number
  skip?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc' | 'ASC' | 'DESC'
  search?: string
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  building_area_id?: number
  building_sub_area_id?: number
  building_type_id?: number
}

export type QueryParams = Record<string, string | string[] | number | boolean | undefined | null>
