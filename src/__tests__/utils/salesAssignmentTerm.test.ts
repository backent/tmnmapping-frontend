import { describe, expect, it } from 'vitest'
import {
  assignmentStatusChip,
  daysLeft,
  isAssignmentExpired,
  termExpiry,
  todayWIB,
} from '@/utils/salesAssignmentTerm'

describe('termExpiry', () => {
  it('runs three months and clamps to the month end, like the backend', () => {
    expect(termExpiry('2026-11-09')).toBe('2027-02-09')
    expect(termExpiry('2026-11-30')).toBe('2027-02-28')
    expect(termExpiry('2027-11-30')).toBe('2028-02-29')
    expect(termExpiry('2026-01-31')).toBe('2026-04-30')
    expect(termExpiry('2026-12-15')).toBe('2027-03-15')
  })

  it('returns empty for a missing or malformed date', () => {
    expect(termExpiry('')).toBe('')
    expect(termExpiry('09/11/2026')).toBe('')
  })
})

describe('todayWIB', () => {
  it('reads the WIB calendar, not UTC', () => {
    // 17:30 UTC on 9 Nov is 00:30 WIB on 10 Nov.
    expect(todayWIB(new Date('2026-11-09T17:30:00Z'))).toBe('2026-11-10')
    expect(todayWIB(new Date('2026-11-09T16:59:00Z'))).toBe('2026-11-09')
  })
})

describe('status', () => {
  it('treats a marked row and a row past its date alike as expired', () => {
    expect(isAssignmentExpired({ status: 'expired', is_expired: true })).toBe(true)
    expect(isAssignmentExpired({ status: 'active', is_expired: true })).toBe(true)
    expect(isAssignmentExpired({ status: 'inactive', is_expired: false })).toBe(false)
  })

  it('labels the chip', () => {
    expect(assignmentStatusChip({ status: 'active', is_expired: false })).toEqual({ label: 'Active', color: 'success' })
    expect(assignmentStatusChip({ status: 'inactive', is_expired: false }).label).toBe('Inactive')
    expect(assignmentStatusChip({ status: 'active', is_expired: true }).label).toBe('Expired')
  })

  it('counts the days left, the expiry day included', () => {
    expect(daysLeft('2026-11-23', '2026-11-09')).toBe(14)
    expect(daysLeft('2026-11-09', '2026-11-09')).toBe(0)
    expect(daysLeft('2026-11-08', '2026-11-09')).toBe(-1)
    expect(daysLeft('', '2026-11-09')).toBeNull()
  })
})
