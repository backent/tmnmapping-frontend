import type { BuildingType, MappingBuilding } from '@/types/mapping'

/**
 * Gets marker color key based on LCD presence status
 * Maps LCD presence status to available marker colors
 */
function getLcdPresenceColorKey(lcdPresenceStatus: string | null): string {
  // Treat null as Opportunity (gray)
  if (!lcdPresenceStatus)
    return 'gray'

  switch (lcdPresenceStatus) {
  case 'TMN':
    return 'blue'
  case 'Competitor':
    return 'red'
  case 'CoExist':
    return 'blue' // Using blue for now, or create light-blue markers
  case 'Opportunity':
    return 'gray'
  default:
    return 'gray'
  }
}

/**
 * Gets the marker icon URL based on building type and LCD presence status
 */
function getMarkerIcon(
  buildingType: BuildingType,
  lcdPresenceStatus: string | null,
): string {
  const typeKey = buildingType.toLowerCase() as 'apartment' | 'hotel' | 'office' | 'retail' | 'other'
  const colorKey = getLcdPresenceColorKey(lcdPresenceStatus)

  return `/marker/${typeKey}-${colorKey}.png`
}

/**
 * Gets marker icon configuration for Google Maps
 * Uses PNG marker icons colored by LCD presence status
 * Note: This requires Google Maps API to be loaded
 */
export function getMarkerIconConfig(
  building: MappingBuilding,
  __: string[],
  ___: boolean,
): google.maps.Icon | null {
  if (typeof google === 'undefined' || !google.maps)
    return null

  const iconUrl = getMarkerIcon(building.building_type, building.lcd_presence_status)

  return {
    url: iconUrl,
    scaledSize: new google.maps.Size(30, 40),
    anchor: new google.maps.Point(15, 40),
  }
}
