import type { MappingBuilding } from '@/types/mapping'

const LCD_COLOR_MAP: Record<string, string> = {
  TMN: '#0b97f3',
  Competitor: '#913c92',
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

const BASE_MARKER_WIDTH = 30
const BASE_MARKER_HEIGHT = 40
export const BASE_MARKER_ZOOM = 14
const MARKER_SCALE_MIN = 0.45
// Capped at 1.0 so markers never exceed their base size — larger pins crowd
// the map at high zoom and hurt readability.
const MARKER_SCALE_MAX = 1.0

/**
 * Scale factor anchored at 1.0 when zoom === BASE_MARKER_ZOOM (14).
 * Doubles every 3 zoom levels (loosely tracks tile doubling), clamped so
 * markers don't vanish at low zoom and don't bloat at high zoom.
 */
export function computeMarkerScale(zoom: number): number {
  const raw = 2 ** ((zoom - BASE_MARKER_ZOOM) / 3)

  return Math.min(MARKER_SCALE_MAX, Math.max(MARKER_SCALE_MIN, raw))
}

export function computeMarkerSize(zoom: number): { width: number; height: number } {
  const factor = computeMarkerScale(zoom)

  return {
    width: Math.round(BASE_MARKER_WIDTH * factor),
    height: Math.round(BASE_MARKER_HEIGHT * factor),
  }
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
 * The viewBox stays fixed at 0 0 60 80 so graphics render identically at any size;
 * only the outer width/height attributes change so the image's NATURAL size
 * matches the target display size. This avoids Google Maps clipping / hit-box
 * mismatches that occur when scaledSize differs from the image's natural size.
 */
function buildPinSvgUrl(color: string, label: string, width: number, height: number): string {
  const fontSize = label.length === 1 ? 36 : 24

  // Vertical center of white circle is at y=26 (cy=26 in 60×80 space)
  // Text baseline = cy + fontSize * 0.36 (approximate cap-height centering)
  const textY = Math.round(30 + fontSize * 0.36)

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 60 80">
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
  zoom: number = BASE_MARKER_ZOOM,
): google.maps.Icon | null {
  if (typeof google === 'undefined' || !google.maps)
    return null

  const color = getLcdPresenceColor(building.lcd_presence_status)
  const label = getBuildingTypeLabel(building.building_type)
  const { width, height } = computeMarkerSize(zoom)

  // size === scaledSize so natural image size matches display size; this keeps
  // the hit-box aligned with the visible marker and prevents clipping on zoom.
  return {
    url: buildPinSvgUrl(color, label, width, height),
    size: new google.maps.Size(width, height),
    scaledSize: new google.maps.Size(width, height),
    anchor: new google.maps.Point(Math.round(width / 2), height),
  }
}
