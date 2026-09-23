// Image interface
export interface BuildingImage {
  name: string
  path: string
}

// Entity interface matching backend response
export interface Building {
  id: number
  external_building_id: string
  iris_code: string
  name: string
  project_name: string
  audience: number
  impression: number
  cbd_area: string
  building_status: string
  competitor_location: boolean
  sellable: string
  connectivity: string
  resource_type: string
  subdistrict: string
  citytown: string
  province: string
  grade_resource: string
  building_type: string
  completion_year: number
  images: BuildingImage[]
  synced_at: string
  created_at: string
  updated_at: string
}

// Update request data (only user-editable fields)
export interface BuildingUpdateData {
  sellable?: string
  connectivity?: string
  resource_type?: string
}

// Pagination parameters for API requests
export interface PaginationParams {
  take?: number
  skip?: number
  orderBy?: string
  orderDirection?: 'ASC' | 'DESC'
  search?: string
  building_status?: string
  sellable?: string
  connectivity?: string
  resource_type?: string
  competitor_location?: boolean
  cbd_area?: string
  subdistrict?: string
  citytown?: string
  province?: string
  grade_resource?: string
  building_type?: string
  exclude_ids?: string
}

// Lightweight building option for dropdown use
export interface BuildingDropdownOption {
  id: number
  name: string
  building_type: string
}

// Filter options from backend
export interface FilterOptions {
  building_status: string[]
  sellable: string[]
  connectivity: string[]
  resource_type: string[]
  cbd_area: string[]
  subdistrict: string[]
  citytown: string[]
  province: string[]
  grade_resource: string[]
  building_type: string[]
}

/**
 * One field of one building changing, attributed and timestamped.
 *
 * This is the undo trail for the spreadsheet import, where a blank cell CLEARS a
 * value. `source` distinguishes a person from the ERP photo sync, which keeps
 * writing after the cutover -- a change nobody made by hand should say so.
 */
export interface BuildingChange {
  id: number
  building_id: number
  external_building_id: string
  building_name: string
  actor_user_id: number
  actor_name: string
  actor_role: string
  action: 'created' | 'updated' | 'deleted'
  source: 'form' | 'import' | 'sync'

  /** Groups one upload. Empty for a form edit or a sync. */
  batch_id: string
  field: string
  old_value: string
  new_value: string
  created_at: string
}
