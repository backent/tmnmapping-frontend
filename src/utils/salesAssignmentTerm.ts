/**
 * Sales assignment terms, mirroring the backend (2026-11-09).
 *
 * A PIC holds a brand for 3 months from the registration date. Every approved
 * quotation the PIC owns for that brand restarts the 3 months from the approval day.
 * When the term runs out a daily job marks the assignment `expired`, and an expired
 * assignment is history: it cannot be edited or deleted, and the brand needs a new
 * assignment. Both dates are set by the system: the registration date is the day the
 * assignment is created, and no edit changes either date (2026-11-09).
 */

import type { SalesAssignment, SalesAssignmentStatus } from '@/types/advertiser'

export const ASSIGNMENT_TERM_MONTHS = 3

const pad = (n: number) => String(n).padStart(2, '0')

/** Today's date in WIB (UTC+7), as YYYY-MM-DD — the calendar the backend uses. */
export function todayWIB(now: Date = new Date()): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000)

  return `${wib.getUTCFullYear()}-${pad(wib.getUTCMonth() + 1)}-${pad(wib.getUTCDate())}`
}

/**
 * The last day of a term starting on `start` (YYYY-MM-DD): 3 months later, clamped
 * to the end of a shorter month (30 Nov → 28 Feb), exactly as the backend computes it.
 * Returns '' for an empty or malformed date.
 */
export function termExpiry(start: string, months: number = ASSIGNMENT_TERM_MONTHS): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(start)
  if (!match)
    return ''

  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const target = new Date(Date.UTC(year, month - 1 + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()

  return `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(Math.min(day, lastDay))}`
}

/** True when the assignment is history and may not be changed. */
export function isAssignmentExpired(item: Pick<SalesAssignment, 'status' | 'is_expired'>): boolean {
  return item.status === 'expired' || item.is_expired
}

export function assignmentStatusChip(item: Pick<SalesAssignment, 'status' | 'is_expired'>): { label: string; color: string } {
  if (isAssignmentExpired(item))
    return { label: 'Expired', color: 'error' }

  const byStatus: Record<Exclude<SalesAssignmentStatus, 'expired'>, { label: string; color: string }> = {
    active: { label: 'Active', color: 'success' },
    inactive: { label: 'Inactive', color: 'secondary' },
  }

  return byStatus[item.status as Exclude<SalesAssignmentStatus, 'expired'>] ?? byStatus.inactive
}

/** Whole days left in the term, counting the expiry day itself; negative once over. */
export function daysLeft(expiryDate: string, today: string = todayWIB()): number | null {
  if (!expiryDate)
    return null
  const ms = Date.parse(`${expiryDate}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)

  return Math.round(ms / 86_400_000)
}
