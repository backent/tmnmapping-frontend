import { describe, expect, it } from 'vitest'
import {
  ALL_ROLES,
  APPROVER_ROLES,
  ROLES,
  isValidRole,
  normalizeRole,
  roleHasAny,
} from '@/config/roles'
import type { Role } from '@/config/roles'

describe('normalizeRole', () => {
  it.each(ALL_ROLES)('passes canonical role %s through', role => {
    expect(normalizeRole(role)).toBe(role)
  })

  // Kept in step with legacyRoleAliases in the backend's models/role.go.
  it.each([
    ['user', ROLES.ADMIN],
    ['author', ROLES.ADMIN],
    ['approver', ROLES.HEAD_OF_SALES],
    ['guest', ROLES.SALES],
  ])('maps legacy role %s to %s', (legacy, expected) => {
    expect(normalizeRole(legacy)).toBe(expected)
  })

  it.each([null, undefined, '', 'wizard', 'Admin'])('returns null for %s', input => {
    expect(normalizeRole(input as string | null | undefined)).toBeNull()
  })
})

describe('isValidRole', () => {
  it.each(ALL_ROLES)('accepts %s', role => {
    expect(isValidRole(role)).toBe(true)
  })

  it.each(['user', 'approver', '', 'wizard', 42, null])('rejects %s', input => {
    expect(isValidRole(input)).toBe(false)
  })
})

describe('APPROVER_ROLES', () => {
  // Approval authority follows the sales hierarchy, not system administration.
  it('does not include admin', () => {
    expect(APPROVER_ROLES).not.toContain(ROLES.ADMIN)
  })

  it('covers the three approval bands', () => {
    expect(APPROVER_ROLES).toEqual([
      ROLES.HEAD_OF_SALES,
      ROLES.HEAD_OF_BUSINESS_CONTROL,
      ROLES.CEO,
    ])
  })
})

describe('roleHasAny', () => {
  it('matches a listed role', () => {
    expect(roleHasAny(ROLES.CEO, APPROVER_ROLES)).toBe(true)
  })

  it('does not match an unlisted role', () => {
    expect(roleHasAny(ROLES.ADMIN, APPROVER_ROLES)).toBe(false)
  })

  it('never matches a null role', () => {
    expect(roleHasAny(null, ALL_ROLES)).toBe(false)
    expect(roleHasAny(null, [] as Role[])).toBe(false)
  })
})
