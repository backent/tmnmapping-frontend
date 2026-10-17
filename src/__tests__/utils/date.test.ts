import { describe, expect, it } from 'vitest'
import { formatCalendarDate } from '@/utils/date'

describe('formatCalendarDate', () => {
  it('formats a YYYY-MM-DD date', () => {
    expect(formatCalendarDate('2026-11-16')).toBe('16 Nov 2026')
  })

  // The API used to send a DATE as a midnight-UTC timestamp; the day is what counts.
  it('reads the day of a midnight-UTC timestamp', () => {
    expect(formatCalendarDate('2026-11-16T00:00:00Z')).toBe('16 Nov 2026')
  })

  // Built from its parts, so no time zone can turn the 1st into the 31st.
  it('never moves to the previous day', () => {
    expect(formatCalendarDate('2026-01-01')).toBe('1 Jan 2026')
  })

  it.each([['', '—'], [null, '—'], [undefined, '—']])('shows a dash for %s', (value, expected) => {
    expect(formatCalendarDate(value)).toBe(expected)
  })

  it('returns anything it cannot read unchanged', () => {
    expect(formatCalendarDate('next month')).toBe('next month')
  })
})
