/**
 * Cookie Utility
 * Handles reading and writing cookies with expiration
 */

/**
 * Get cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined')
    return null

  const nameEQ = `${name}=`
  const cookies = document.cookie.split(';')

  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i]
    while (cookie.charAt(0) === ' ')
      cookie = cookie.substring(1, cookie.length)

    if (cookie.indexOf(nameEQ) === 0)
      return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length))
  }

  return null
}

/**
 * Set cookie with expiration
 * @param name - Cookie name
 * @param value - Cookie value
 * @param days - Number of days until expiration
 */
export function setCookie(name: string, value: string, days: number): void {
  if (typeof document === 'undefined')
    return

  const expires = new Date()

  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000)

  const cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`

  document.cookie = cookie
}

/**
 * Generate UUID v4
 * Uses crypto.randomUUID() if available, otherwise falls back to manual generation
 */
export function generateUUID(): string {
  // Use native crypto.randomUUID() if available (modern browsers)
  if (typeof crypto !== 'undefined' && crypto.randomUUID)
    return crypto.randomUUID()

  // Fallback: manual UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8

    return v.toString(16)
  })
}
