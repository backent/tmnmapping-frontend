/**
 * Converts an ERP image path to use the backend API proxy endpoint
 * 
 * @param path - The image path from ERP (can be relative or absolute)
 * @returns The proxied image path that will be forwarded through backend API
 */
export function getImageProxyPath(path: string): string {
  if (!path) {
    return path
  }

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

