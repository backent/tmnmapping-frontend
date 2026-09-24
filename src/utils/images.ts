/**
 * Converts an ERP image path to use the backend API proxy endpoint
 *
 * @param path - The image path from ERP (can be relative or absolute)
 * @returns The proxied image path that will be forwarded through backend API
 */
export function getImageProxyPath(path: string): string {
  if (!path)
    return path

  // If path already starts with http:// or https://, extract just the path part
  if (path.startsWith('http://') || path.startsWith('https://')) {
    try {
      const url = new URL(path)

      // Use the pathname and search params, but proxy through backend API
      return `/api/erp-images${url.pathname}${url.search}`
    }
    catch {
      // If URL parsing fails, return as is
      return path
    }
  }

  // For relative paths, prepend /api/erp-images
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  return `/api/erp-images${cleanPath}`
}

/**
 * The URL for one of a building's four photos.
 *
 * Prefer this over getImageProxyPath: the server decides what answers, returning the
 * photo this application hosts when there is one and ERP's when there is not. The
 * caller asks for "building 42's front photo" and never has to know which side of the
 * cutover it came from.
 *
 * The `v` parameter exists so a replacement is seen. The URL itself does not change
 * when a photo is replaced -- only the file behind it does -- so without a changing
 * query a browser would keep showing the old picture from cache.
 */
export function buildingImageUrl(buildingId: number, slot: BuildingImageSlot, version?: string | number): string {
  const bust = version ? `?v=${encodeURIComponent(String(version))}` : ''

  return `/api/building-images/${buildingId}/${slot}${bust}`
}

/** The four photos, matching ERP's own names so the fallback is one-for-one. */
export const BUILDING_IMAGE_SLOTS = ['front', 'back', 'left', 'right_side'] as const

export type BuildingImageSlot = typeof BUILDING_IMAGE_SLOTS[number]

/** "right_side" reads as "Right Side". */
export function buildingImageSlotLabel(slot: string): string {
  return slot.split('_').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ')
}
