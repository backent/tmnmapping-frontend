export const BUILDING_TYPES = {
  APARTMENT: 'Apartment',
  OFFICE: 'Office',
  HOTEL: 'Hotel',
  RETAIL: 'Retail',
  OTHER: 'Other',
} as const

export const LCD_PRESENCE = {
  TMN: 'TMN',
  FMI: 'FMI',
  DFI: 'DFI',
  OPPORTUNITIES: 'Opportunities',
  OTHER: 'Other',
} as const

export const INSTALLATION_STATUS = {
  COMPLETE: 'complete',
  INCOMPLETE: 'incomplete',
  NEED_REQUEST: 'needrequest',
} as const

export const MARKER_COLORS = {
  PURPLE: 'purple',
  YELLOW: 'yellow',
  RED: 'red',
  BLUE: 'blue',
  GRAY: 'gray',
} as const

// Marker icon paths (relative to public/marker/)
export const MARKER_ICONS = {
  apartment: {
    purple: '/marker/apartment-purple.png',
    yellow: '/marker/apartment-yellow.png',
    red: '/marker/apartment-red.png',
    blue: '/marker/apartment-blue.png',
    gray: '/marker/apartment-gray.png',
  },
  hotel: {
    purple: '/marker/hotel-purple.png',
    yellow: '/marker/hotel-yellow.png',
    red: '/marker/hotel-red.png',
    blue: '/marker/hotel-blue.png',
    gray: '/marker/hotel-gray.png',
  },
  office: {
    purple: '/marker/office-purple.png',
    yellow: '/marker/office-yellow.png',
    red: '/marker/office-red.png',
    blue: '/marker/office-blue.png',
    gray: '/marker/office-gray.png',
  },
  retail: {
    purple: '/marker/retail-purple.png',
    yellow: '/marker/retail-yellow.png',
    red: '/marker/retail-red.png',
    blue: '/marker/retail-blue.png',
    gray: '/marker/retail-gray.png',
  },
  other: {
    purple: '/marker/other-purple.png',
    yellow: '/marker/other-yellow.png',
    red: '/marker/other-red.png',
    blue: '/marker/other-blue.png',
    gray: '/marker/other-gray.png',
  },
} as const

// Building grade options
export const BUILDING_GRADES = [
  { name: 'Premium', value: 'Premium' },
  { name: 'Grade A', value: 'Grade A' },
  { name: 'Grade B', value: 'Grade B' },
  { name: '5-Star', value: '5-Star' },
  { name: '4-Star', value: '4-Star' },
  { name: '3-Star', value: '3-Star' },
  { name: 'Not Graded', value: 'NotGraded' },
] as const

// Progress options
export const PROGRESS_OPTIONS = [
  { name: 'Project Created', value: 'Project Created' },
  { name: 'First Meeting', value: 'i. First Meeting' },
  { name: 'Negotiation', value: 'ii. Negotiation' },
  { name: 'Waiting Approval', value: 'iii. Waiting Approval' },
  { name: 'Proposal Approval', value: 'iv. Proposal Approval' },
  { name: 'Waiting Confirmation', value: 'v. Waiting Confirmation' },
  { name: 'Confirmation / LOI Signed', value: 'vi. Confirmation / LOI Signed' },
] as const

// Default districts (can be overridden by API)
export const DEFAULT_DISTRICTS = [
  { name: 'Jakarta Pusat', value: 'Jakarta Pusat' },
  { name: 'Jakarta Selatan', value: 'Jakarta Selatan' },
  { name: 'Jakarta Barat', value: 'Jakarta Barat' },
  { name: 'Jakarta Timur', value: 'Jakarta Timur' },
  { name: 'Jakarta Utara', value: 'Jakarta Utara' },
  { name: 'Bekasi', value: 'Bekasi' },
  { name: 'Bogor', value: 'Bogor' },
  { name: 'Tangerang', value: 'Tangerang' },
] as const

