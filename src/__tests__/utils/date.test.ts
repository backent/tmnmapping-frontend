import { describe, expect, it } from 'vitest'
import { formatCalendarDate, formatRelativeDay, isPastCalendarDate } from '@/utils/date'

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

describe('isPastCalendarDate', () => {
  const today = new Date(2026, 9, 17, 15, 30)

  it('is past the day after it ends', () => {
    expect(isPastCalendarDate('2026-10-16', today)).toBe(true)
  })

  // A quotation valid until today can still be accepted today.
  it('is not past on the day itself', () => {
    expect(isPastCalendarDate('2026-10-17', today)).toBe(false)
  })

  it('is not past for a future date or a missing one', () => {
    expect(isPastCalendarDate('2026-11-16', today)).toBe(false)
    expect(isPastCalendarDate('', today)).toBe(false)
    expect(isPastCalendarDate(undefined, today)).toBe(false)
  })
})

describe('formatRelativeDay', () => {
  const now = new Date(2026, 9, 17, 9, 0)

  it.each([
    [new Date(2026, 9, 17, 8, 0), 'Today'],
    [new Date(2026, 9, 16, 23, 30), 'Yesterday'],
    [new Date(2026, 9, 14, 12, 0), '3 days ago'],
    [new Date(2026, 9, 8, 12, 0), '8 Oct'],
    [new Date(2025, 9, 8, 12, 0), '8 Oct 2025'],
  ])('reads %s as %s', (date, expected) => {
    expect(formatRelativeDay(date.toISOString(), now)).toBe(expected)
  })

  it('shows a dash when there is no date', () => {
    expect(formatRelativeDay('', now)).toBe('—')
  })
})
