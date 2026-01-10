// Marker status types
export type MarkerStatus =
  | 'tmn_installed'      // Purple - TMN installed
  | 'incomplete'          // Yellow - Incomplete/Need Request
  | 'competitor_only'     // Red - Competitor only
  | 'tmn_plus_competitor' // Blue - TMN + Competitor
  | 'opportunity'         // Gray - Opportunity (no installation)
  | 'reporting'          // Purple - Reporting mode

export type BuildingType =
  | 'Apartment'
  | 'Office'
  | 'Hotel'
  | 'Retail'
  | 'Other'

export type LCDPresence =
  | 'TMN'
  | 'FMI'
  | 'DFI'
  | 'Opportunities'
  | 'Other'

export type InstallationStatus =
  | 'complete'
  | 'incomplete'
  | 'needrequest'

// Mapping building interface matching oldmapping structure
export interface MappingBuilding {
  id: number
  building_name: string
  building_type: BuildingType
  address: string
  coordinates: {
    lat: number
    lng: number
  }
  tower_id: string | null
  screen_installed: string | null
  fmi: 'Yes' | 'No'
  dfi: 'Yes' | 'No'
  other: 'Yes' | 'No'
  installation: InstallationStatus
  status: string
  building_grade: string
  last_renovated: number | null
  completion_year: number | null
  no_of_floors: number | null
  units: string | null
  photos: {
    data: Array<{
      full_path: string
    }>
  }
  job_detail_info: Array<{
    screen: {
      screen_size_name: string
      screen_point_name: string
    }
  }>
  impression?: string
  audience_actual?: number
  ordered?: number
}

// Mapping filters interface
export interface MappingFilters {
  // Location filters
  region?: string
  district_subdistrict?: string[]
  lat?: number
  lng?: number
  radius?: number // in kilometers

  // Building filters
  building_type?: BuildingType[]
  building_grade?: string[]
  building_name?: string[]

  // Installation filters
  installation?: InstallationStatus[]
  screen_type?: string[]
  screen_point?: string[]
  progress?: string[]

  // Presence filters
  lcd_presence?: LCDPresence[]

  // Other filters
  year?: [number, number] // [min, max]
  places_id?: string
}

// API response with totals
export interface MappingResponse {
  data: MappingBuilding[]
  total_appartment: number
  total_hotel: number
  total_office: number
  total_retail: number
  total_others: number
}

// Filter options from backend
export interface MappingFilterOptions {
  district: string[]
  subdistrict: string[]
  screenTypes: Array<{
    id: number
    name: string
    screensize_id: number
    screenpoint_id: number
  }>
  buildingGrades: Array<{
    name: string
    value: string
  }>
  progress: Array<{
    name: string
    value: string
  }>
  yearList: number[]
}

// Potential client interface
export interface PotentialClient {
  id: number
  name: string
  color: string
  places: Array<{
    id: number
    latlang: {
      coordinates: [number, number] // [lng, lat]
    }
  }>
}

// Screen type option
export interface ScreenTypeOption {
  id: number
  name: string
  screensize_id: number
  screenpoint_id: number
}

// Region search response
export interface RegionSearchResponse {
  district: string[]
  subdistrict: string[]
}

