/**
 * Calendar dates: values with a day but no time, such as a quotation's validity.
 *
 * `new Date('2026-11-16')` is midnight UTC, which west of Greenwich is still the 15th.
 * A calendar date has no time zone, so it is built from its parts as a local date
 * instead, and can never show as the day before.
 */

const CALENDAR_DATE = /^(\d{4})-(\d{2})-(\d{2})/

/**
 * "16 Nov 2026" for "2026-11-16", or for a timestamp whose date part is that day.
 *
 * The timestamp form is what the API sent before it formatted DATE columns itself;
 * it is accepted so an older backend still renders a sensible value. Anything else
 * is returned unchanged, and an empty value as a dash.
 */
export function formatCalendarDate(value: string | null | undefined): string {
  if (!value)
    return '—'

  const match = CALENDAR_DATE.exec(value)
  if (!match)
    return value

  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))

  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function startOfDay(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Whether a calendar date (YYYY-MM-DD) is before today. Today itself is still valid. */
export function isPastCalendarDate(value: string | null | undefined, today: Date = new Date()): boolean {
  const match = value ? CALENDAR_DATE.exec(value) : null
  if (!match)
    return false

  const [, year, month, day] = match

  return new Date(Number(year), Number(month) - 1, Number(day)).getTime() < startOfDay(today)
}

/**
 * When something last changed, in days: "Today", "Yesterday", "3 days ago", then
 * "8 Oct" within the year and "8 Oct 2025" before it. Counted in calendar days, so
 * something changed late last night reads as yesterday, not "0 days ago".
 */
export function formatRelativeDay(value: string | null | undefined, now: Date = new Date()): string {
  if (!value)
    return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime()))
    return value

  const days = Math.round((startOfDay(now) - startOfDay(date)) / 86_400_000)

  if (days <= 0)
    return 'Today'
  if (days === 1)
    return 'Yesterday'
  if (days < 7)
    return `${days} days ago`

  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    ...(date.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
  }).format(date)
}
