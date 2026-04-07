import type { MappingBuilding } from '@/types/mapping'

const LCD_COLOR_MAP: Record<string, string> = {
  TMN: '#0b97f3',
  Competitor: '#c72b29',
  CoExist: '#5ecce0',
  Opportunity: '#8d91a9',
}

/**
 * Labels matching the existing PNG markers, keyed by building_type from the API.
 * Falls back to the first uppercase letter for any unknown type.
 */
const BUILDING_TYPE_LABEL: Record<string, string> = {
  Apartment: 'A',
  Hotel: 'H',
  Office: 'O',
  Retail: 'R',
  Other: 'OT',
}

function getLcdPresenceColor(lcdPresenceStatus: string | null): string {
  if (!lcdPresenceStatus)
    return '#8d91a9'
  return LCD_COLOR_MAP[lcdPresenceStatus] ?? '#8d91a9'
}

function getBuildingTypeLabel(buildingType: string): string {
  if (BUILDING_TYPE_LABEL[buildingType])
    return BUILDING_TYPE_LABEL[buildingType]
  const words = buildingType.trim().split(/\s+/)
  return words
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('')
}

/**
 * Builds an SVG data URL that matches the existing PNG marker style:
 * - Same teardrop pin shape as the original PNGs
 * - Large white circle in the center
 * - Bold dark-gray building type letter(s) inside the circle
 *
 * Uses a 60×80 viewBox (2× the rendered size) for crisp text rendering.
 */
function buildPinSvgUrl(color: string, label: string): string {
  // 2× coordinate space: pin renders at 30×40 CSS px, but SVG units are 60×80
  const fontSize = label.length === 1 ? 36 : 24
  // Vertical center of white circle is at y=26 (cy=26 in 60×80 space)
  // Text baseline = cy + fontSize * 0.36 (approximate cap-height centering)
  const textY = Math.round(30 + fontSize * 0.36)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="80" viewBox="0 0 60 80">
    <path d="M30 0C13.431 0 0 13.431 0 30c0 21 30 50 30 50s30-29 30-50C60 13.431 46.569 0 30 0z" fill="${color}"/>
    <circle cx="30" cy="30" r="20" fill="#ffffff"/>
    <text x="30" y="${textY}" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="900" fill="#3d3d3d">${label}</text>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}

/**
 * Gets marker icon configuration for Google Maps.
 * Renders a coloured pin SVG (inline data URL) that matches the existing PNG marker style,
 * with color driven by LCD presence status and label by building_type from the API.
 * Note: This requires Google Maps API to be loaded.
 */
export function getMarkerIconConfig(
  building: MappingBuilding,
  __: string[],
  ___: boolean,
): google.maps.Icon | null {
  if (typeof google === 'undefined' || !google.maps)
    return null

  const color = getLcdPresenceColor(building.lcd_presence_status)
  const label = getBuildingTypeLabel(building.building_type)

  return {
    url: buildPinSvgUrl(color, label),
    scaledSize: new google.maps.Size(30, 40),
    anchor: new google.maps.Point(15, 40),
  }
}
