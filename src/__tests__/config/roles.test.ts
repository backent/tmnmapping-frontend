import { describe, expect, it } from 'vitest'
import {
  ALL_ROLES,
  APPROVER_ROLES,
  PERMISSIONS,
  ROLES,
  isValidRole,
  normalizeRole,
  roleCan,
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

describe('roleCan', () => {
  it('grants every "manage" permission to admin only', () => {
    const managePermissions = Object.keys(PERMISSIONS)
      .filter(permission => permission.endsWith('.manage')) as (keyof typeof PERMISSIONS)[]

    expect(managePermissions.length).toBeGreaterThan(0)

    for (const permission of managePermissions) {
      expect(roleCan(ROLES.ADMIN, permission)).toBe(true)

      for (const role of ALL_ROLES.filter(r => r !== ROLES.ADMIN))
        expect(roleCan(role, permission), `${role} should not hold ${permission}`).toBe(false)
    }
  })

  it('grants shared read permissions to every role', () => {
    for (const role of ALL_ROLES) {
      expect(roleCan(role, 'buildings.view')).toBe(true)
      expect(roleCan(role, 'mapping.view')).toBe(true)
      expect(roleCan(role, 'pois.view')).toBe(true)
      expect(roleCan(role, 'sales-packages.view')).toBe(true)
    }
  })

  it('restricts the administration screens to admin', () => {
    expect(roleCan(ROLES.SALES, 'master-data.view')).toBe(false)
    expect(roleCan(ROLES.SALES, 'building-restrictions.view')).toBe(false)
    expect(roleCan(ROLES.ADMIN, 'master-data.view')).toBe(true)
  })

  it('denies everything for a null role', () => {
    for (const permission of Object.keys(PERMISSIONS) as (keyof typeof PERMISSIONS)[])
      expect(roleCan(null, permission)).toBe(false)
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
