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

  /**
   * ERP's spelling, kept because the LOI dashboard joins letters to buildings on
   *  this text. Not the same as the project's own name.
   */
  project_name: string
  project_id: number

  /** The project's CODE. What the spreadsheet and the change log speak in. */
  project_id_iris: string

  /** The project's own name, joined. */
  project_display_name: string

  audience: number
  impression: number
  cbd_area: string
  building_status: string

  /** Mirrors competitor_presence; the map filters on it. */
  competitor_location: boolean
  competitor_presence: boolean
  competitor_exclusive: boolean

  sellable: string
  connectivity: string
  resource_type: string
  subdistrict: string
  citytown: string
  province: string
  grade_resource: string
  building_type: string
  completion_year: number

  latitude: number
  longitude: number

  /** Derived from building_status and the two competitor flags. Never set directly. */
  lcd_presence_status: string

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

/**
 * The building form's payload, for both create and update.
 *
 * The form REPLACES the record, so every column it owns is sent and a blank clears
 * it -- the same rule the spreadsheet import follows. Photos are absent because the
 * ERP sync still owns them, and LCD presence and location are absent because both are
 * derived: one from status and the competitor flags, the other from the coordinates.
 */
export interface SaveBuildingRequest {
  external_building_id: string
  name: string
  iris_code: string

  /** The project's CODE. An unknown one raises an empty project rather than failing. */
  project_id_iris: string
  latitude: number
  longitude: number
  subdistrict: string
  citytown: string
  province: string
  cbd_area: string
  building_type: string
  grade_resource: string
  completion_year: number
  building_status: string
  competitor_presence: boolean
  competitor_exclusive: boolean
  audience: number
  impression: number
  sellable: string
  connectivity: string
  resource_type: string
}
