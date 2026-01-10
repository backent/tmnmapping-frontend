import type { MappingBuilding, MarkerStatus, BuildingType } from '@/types/mapping'
import { MARKER_ICONS } from './mappingConstants'
import { INSTALLATION_STATUS } from './mappingConstants'

/**
 * Determines the marker status based on building properties
 */
export function getMarkerStatus(
  building: MappingBuilding,
  installation: string[],
  reporting: boolean,
): MarkerStatus {
  if (reporting) {
    return 'reporting'
  }

  // Check if installation includes complete
  const hasComplete = installation.includes(INSTALLATION_STATUS.COMPLETE)
  const hasIncomplete = installation.includes(INSTALLATION_STATUS.INCOMPLETE)
  const hasNeedRequest = installation.includes(INSTALLATION_STATUS.NEED_REQUEST)

  if (hasComplete && !hasIncomplete && !hasNeedRequest) {
    return 'tmn_installed'
  }

  if (hasIncomplete || hasNeedRequest) {
    return 'incomplete'
  }

  // Competitor only (no TMN)
  if (
    (building.screen_installed === null || building.tower_id === null) &&
    (building.fmi === 'Yes' || building.dfi === 'Yes' || building.other === 'Yes')
  ) {
    return 'competitor_only'
  }

  // TMN installed (no competitors)
  if (
    building.tower_id !== null &&
    building.screen_installed !== null &&
    building.fmi === 'No' &&
    building.dfi === 'No' &&
    building.other === 'No'
  ) {
    return 'tmn_installed'
  }

  // TMN + Competitor
  if (
    building.tower_id !== null &&
    (building.fmi === 'Yes' || building.dfi === 'Yes' || building.other === 'Yes')
  ) {
    return 'tmn_plus_competitor'
  }

  // Opportunity (no installation, no competitors)
  if (
    building.tower_id === null &&
    building.fmi === 'No' &&
    building.dfi === 'No' &&
    building.other === 'No'
  ) {
    return 'opportunity'
  }

  // TMN but not installed yet
  if (
    building.tower_id !== null &&
    building.screen_installed === null &&
    building.fmi === 'No' &&
    building.dfi === 'No' &&
    building.other === 'No'
  ) {
    return 'incomplete'
  }

  return 'opportunity'
}

/**
 * Gets the marker icon URL based on building type and status
 */
export function getMarkerIcon(
  buildingType: BuildingType,
  status: MarkerStatus,
): string {
  const typeKey = buildingType.toLowerCase() as keyof typeof MARKER_ICONS
  const colorKey = statusToColor(status)

  return MARKER_ICONS[typeKey]?.[colorKey] || MARKER_ICONS.other.gray
}

/**
 * Converts marker status to color key
 */
function statusToColor(status: MarkerStatus): keyof typeof MARKER_ICONS.apartment {
  switch (status) {
    case 'tmn_installed':
    case 'reporting':
      return 'purple'
    case 'incomplete':
      return 'yellow'
    case 'competitor_only':
      return 'red'
    case 'tmn_plus_competitor':
      return 'blue'
    case 'opportunity':
      return 'gray'
    default:
      return 'gray'
  }
}

/**
 * Gets marker icon configuration for Google Maps
 * Note: This requires Google Maps API to be loaded
 */
export function getMarkerIconConfig(
  building: MappingBuilding,
  installation: string[],
  reporting: boolean,
): google.maps.Icon | null {
  if (typeof google === 'undefined' || !google.maps) {
    return null
  }

  const status = getMarkerStatus(building, installation, reporting)
  const iconUrl = getMarkerIcon(building.building_type, status)

  return {
    url: iconUrl,
    scaledSize: new google.maps.Size(20, 30),
    anchor: new google.maps.Point(10, 30),
  }
}

