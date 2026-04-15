import { afterEach, describe, expect, it } from 'vitest'
import { generateUUID, getCookie, setCookie } from '@/utils/cookies'

/**
 * jsdom provides document.cookie, but it does not honor expires/path in
 * the same way as real browsers. We can still set and read cookie values.
 */

function clearAllCookies() {
  document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim()

    document.cookie = `${name}=;expires=${new Date(0).toUTCString()};path=/`
  })
}

describe('getCookie', () => {
  afterEach(() => {
    clearAllCookies()
  })

  it('returns null when the cookie does not exist', () => {
    expect(getCookie('nonExistentCookie')).toBeNull()
  })

  it('returns the correct value for an existing cookie', () => {
    document.cookie = 'testCookie=helloWorld'
    expect(getCookie('testCookie')).toBe('helloWorld')
  })

  it('returns the correct value when multiple cookies are set', () => {
    document.cookie = 'cookieA=alpha'
    document.cookie = 'cookieB=beta'
    expect(getCookie('cookieA')).toBe('alpha')
    expect(getCookie('cookieB')).toBe('beta')
  })

  it('decodes URI-encoded cookie values', () => {
    // setCookie encodes values with encodeURIComponent
    document.cookie = `encoded=${encodeURIComponent('hello world')}`
    expect(getCookie('encoded')).toBe('hello world')
  })

  it('returns null when document is undefined (SSR context)', () => {
    const originalDocument = globalThis.document

    // @ts-expect-error - simulating SSR where document is undefined
    delete globalThis.document
    expect(getCookie('any')).toBeNull()
    globalThis.document = originalDocument
  })
})

describe('setCookie', () => {
  afterEach(() => {
    clearAllCookies()
  })

  it('sets a cookie that can be retrieved by getCookie', () => {
    setCookie('myKey', 'myValue', 1)
    expect(getCookie('myKey')).toBe('myValue')
  })

  it('encodes special characters in the cookie value', () => {
    setCookie('special', 'hello world & more', 1)
    expect(getCookie('special')).toBe('hello world & more')
  })

  it('overwrites an existing cookie with the same name', () => {
    setCookie('updatable', 'first', 1)
    setCookie('updatable', 'second', 1)
    expect(getCookie('updatable')).toBe('second')
  })

  it('does nothing when document is undefined (SSR context)', () => {
    const originalDocument = globalThis.document

    // @ts-expect-error - simulating SSR
    delete globalThis.document

    // Should not throw
    expect(() => setCookie('key', 'value', 1)).not.toThrow()
    globalThis.document = originalDocument
  })
})

describe('generateUUID', () => {
  const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

  it('generates a string that matches the UUID v4 format', () => {
    const uuid = generateUUID()

    expect(uuid).toMatch(UUID_V4_REGEX)
  })

  it('generates unique UUIDs on successive calls', () => {
    const uuids = new Set(Array.from({ length: 20 }, () => generateUUID()))

    expect(uuids.size).toBe(20)
  })

  it('falls back to manual generation when crypto.randomUUID is unavailable', () => {
    const originalRandomUUID = crypto.randomUUID

    // @ts-expect-error - simulate older environment without randomUUID
    crypto.randomUUID = undefined

    const uuid = generateUUID()

    expect(uuid).toMatch(UUID_V4_REGEX)

    crypto.randomUUID = originalRandomUUID
  })
})
