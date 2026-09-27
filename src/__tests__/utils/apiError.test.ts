import { describe, expect, it } from 'vitest'
import { extractApiError } from '@/utils/apiError'

/** Builds the error `utils/http.ts` throws for a given backend envelope. */
function thrownError(status: number, envelope: unknown) {
  const error = new Error(`HTTP error! Status: ${status}`) as any

  error.status = status
  error.details = envelope

  return error
}

describe('extractApiError', () => {
  it('reads the message out of the envelope the backend actually sends', () => {
    const error = thrownError(400, {
      status: 'BAD REQUEST',
      code: 400,
      data: 'invalid credentials',
      extras: null,
    })

    expect(extractApiError(error, 'Login failed.')).toBe('invalid credentials')
  })

  // The bug this helper exists for: `details.message` is undefined, the old
  // expression fell through to the envelope object, and Vue rendered it as JSON.
  it('never returns an object, whatever the envelope looks like', () => {
    const envelopes = [
      { status: 'BAD REQUEST', code: 400, data: 'invalid credentials', extras: null },
      { status: 'INTERNAL SERVER ERROR', code: 500, data: null, extras: null },
      { code: 500 },
      {},
      [],
      null,
    ]

    for (const envelope of envelopes) {
      const result = extractApiError(thrownError(400, envelope), 'Something failed.')

      expect(typeof result).toBe('string')
      expect(result).not.toContain('[object Object]')
      expect(result).not.toContain('"code"')
      expect(result).not.toContain('{')
    }
  })

  it('falls back when the server sent nothing usable', () => {
    expect(extractApiError(thrownError(500, { data: '' }), 'Could not save.')).toBe('Could not save.')
    expect(extractApiError(thrownError(500, { data: '   ' }), 'Could not save.')).toBe('Could not save.')
    expect(extractApiError(thrownError(500, {}), 'Could not save.')).toBe('Could not save.')
    expect(extractApiError(undefined, 'Could not save.')).toBe('Could not save.')
  })

  it('passes through the 500 sentence, which already carries its reference', () => {
    const error = thrownError(500, {
      status: 'INTERNAL SERVER ERROR',
      code: 500,
      data: 'Something went wrong on our side. Please try again — if it keeps happening, quote reference ERR-7F3A2C so we can trace it.',
      extras: { reference: 'ERR-7F3A2C' },
    })

    const result = extractApiError(error, 'Could not save.')

    expect(result).toContain('ERR-7F3A2C')
    expect(result).not.toContain('reference ERR-7F3A2C)')
  })

  // If the body were unreadable we would otherwise leave the operator with
  // nothing to quote to support.
  it('appends the reference when it had to fall back', () => {
    const error = thrownError(500, { data: null, extras: { reference: 'ERR-ABC123' } })

    expect(extractApiError(error, 'Could not save.')).toBe('Could not save. (reference ERR-ABC123)')
  })

  it('explains an expired session instead of a silent logout', () => {
    const error = thrownError(401, { data: 'authorization required' })

    expect(extractApiError(error, 'Failed.')).toBe('Your session has expired. Please sign in again.')
  })

  it('explains an unreachable server rather than saying "failed to fetch"', () => {
    expect(extractApiError(new TypeError('Failed to fetch'), 'Failed.'))
      .toBe('Could not reach the server. Check your connection and try again.')
  })

  it('handles the plain-text body an unknown route returns', () => {
    expect(extractApiError(thrownError(404, '404 page not found'), 'Failed.')).toBe('404 page not found')
  })

  it('still finds a nested message field if a payload uses that name', () => {
    expect(extractApiError(thrownError(400, { message: 'Row 4: Building Code is required' }), 'Failed.'))
      .toBe('Row 4: Building Code is required')
  })
})
