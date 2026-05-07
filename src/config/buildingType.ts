export interface BuildingTypeCode {
  code: string
  name: string
}

// Fixed list of building type codes shown as chips on the mapping page filter sidebar.
// Order here drives the on-screen row layout (4 + 4 + 2 in a 4-column grid).
// `name` must match the canonical `building_type` value returned by the API; the ERP
// sync collapses any unknown type to "Other" upstream, so this list is authoritative.
export const BUILDING_TYPE_CODES: BuildingTypeCode[] = [
  { code: 'AP', name: 'Apartment' },
  { code: 'OF', name: 'Office' },
  { code: 'HT', name: 'Hotel' },
  { code: 'MA', name: 'Mall' },
  { code: 'GC', name: 'Golf Course' },
  { code: 'TP', name: 'Tennis & Padel' },
  { code: 'YP', name: 'Yoga Pilates' },
  { code: 'DN', name: 'Dining' },
  { code: 'SR', name: 'Spa & Reflexology' },
  { code: 'OT', name: 'Other' },
]
