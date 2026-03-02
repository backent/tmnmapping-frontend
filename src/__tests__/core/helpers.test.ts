import { describe, expect, it } from 'vitest'
import { isEmpty, isEmptyArray, isNullOrUndefined, isObject, isToday } from '@core/utils/helpers'

describe('isEmpty', () => {
  it('returns true for null', () => {
    expect(isEmpty(null)).toBe(true)
  })

  it('returns true for undefined', () => {
    expect(isEmpty(undefined)).toBe(true)
  })

  it('returns true for empty string', () => {
    expect(isEmpty('')).toBe(true)
  })

  it('returns true for empty array', () => {
    expect(isEmpty([])).toBe(true)
  })

  it('returns false for non-empty string', () => {
    expect(isEmpty('hello')).toBe(false)
  })

  it('returns false for non-empty array', () => {
    expect(isEmpty([1, 2, 3])).toBe(false)
  })

  it('returns false for number 0', () => {
    expect(isEmpty(0)).toBe(false)
  })

  it('returns false for number 1', () => {
    expect(isEmpty(1)).toBe(false)
  })

  it('returns false for false boolean', () => {
    expect(isEmpty(false)).toBe(false)
  })

  it('returns false for plain object (even empty)', () => {
    // isEmpty only checks null, undefined, empty string, and empty array
    expect(isEmpty({})).toBe(false)
  })
})

describe('isNullOrUndefined', () => {
  it('returns true for null', () => {
    expect(isNullOrUndefined(null)).toBe(true)
  })

  it('returns true for undefined', () => {
    expect(isNullOrUndefined(undefined)).toBe(true)
  })

  it('returns false for 0', () => {
    expect(isNullOrUndefined(0)).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isNullOrUndefined('')).toBe(false)
  })

  it('returns false for false', () => {
    expect(isNullOrUndefined(false)).toBe(false)
  })

  it('returns false for empty array', () => {
    expect(isNullOrUndefined([])).toBe(false)
  })

  it('returns false for empty object', () => {
    expect(isNullOrUndefined({})).toBe(false)
  })
})

describe('isEmptyArray', () => {
  it('returns true for an empty array', () => {
    expect(isEmptyArray([])).toBe(true)
  })

  it('returns false for non-empty array', () => {
    expect(isEmptyArray([1, 2, 3])).toBe(false)
  })

  it('returns false for array with falsy items', () => {
    expect(isEmptyArray([null, undefined, 0])).toBe(false)
  })

  it('returns false for null', () => {
    expect(isEmptyArray(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isEmptyArray(undefined)).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isEmptyArray('hello')).toBe(false)
  })

  it('returns false for an object', () => {
    expect(isEmptyArray({})).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isEmptyArray(42)).toBe(false)
  })
})

describe('isObject', () => {
  it('returns true for a plain empty object', () => {
    expect(isObject({})).toBe(true)
  })

  it('returns true for an object with keys', () => {
    expect(isObject({ a: 1, b: 'hello' })).toBe(true)
  })

  it('returns false for null (typeof null === "object" trap)', () => {
    expect(isObject(null)).toBe(false)
  })

  it('returns false for an array (arrays are objects but excluded)', () => {
    expect(isObject([])).toBe(false)
  })

  it('returns false for a non-empty array', () => {
    expect(isObject([1, 2, 3])).toBe(false)
  })

  it('returns false for a string', () => {
    expect(isObject('string')).toBe(false)
  })

  it('returns false for a number', () => {
    expect(isObject(42)).toBe(false)
  })

  it('returns false for a boolean', () => {
    expect(isObject(true)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(isObject(undefined)).toBe(false)
  })
})

describe('isToday', () => {
  it('returns true for the current date', () => {
    expect(isToday(new Date())).toBe(true)
  })

  it('returns false for yesterday', () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(isToday(yesterday)).toBe(false)
  })

  it('returns false for tomorrow', () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    expect(isToday(tomorrow)).toBe(false)
  })

  it('returns false for same day last year', () => {
    const lastYear = new Date()
    lastYear.setFullYear(lastYear.getFullYear() - 1)
    expect(isToday(lastYear)).toBe(false)
  })

  it('returns true for a different time on the same day', () => {
    const sameDay = new Date()
    sameDay.setHours(0, 0, 0, 0)
    expect(isToday(sameDay)).toBe(true)
  })
})
