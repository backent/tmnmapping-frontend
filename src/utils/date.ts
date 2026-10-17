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
