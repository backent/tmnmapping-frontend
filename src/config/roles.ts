/**
 * Role vocabulary and permission map.
 *
 * Mirrors backend `models/role.go`. The backend is the enforcement point for every
 * mutation; the checks here drive navigation and route access so that users are not
 * shown screens that will only fail with a 403.
 */

export const ROLES = {
  ADMIN: 'admin',
  SALES: 'sales',
  HEAD_OF_SALES: 'head_of_sales',
  HEAD_OF_BUSINESS_CONTROL: 'head_of_business_control',
  CEO: 'ceo',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

/** Every recognised role, ascending by authority. */
export const ALL_ROLES: Role[] = [
  ROLES.SALES,
  ROLES.HEAD_OF_SALES,
  ROLES.HEAD_OF_BUSINESS_CONTROL,
  ROLES.CEO,
  ROLES.ADMIN,
]

/** Roles that act on a quotation approval queue. `admin` is deliberately excluded. */
export const APPROVER_ROLES: Role[] = [
  ROLES.HEAD_OF_SALES,
  ROLES.HEAD_OF_BUSINESS_CONTROL,
  ROLES.CEO,
]

/**
 * Pre-Phase-0 vocabulary, kept in step with `legacyRoleAliases` in the backend.
 * Migration 015 rewrote the column, so these only surface if a row is written
 * outside the app.
 */
const LEGACY_ROLE_ALIASES: Record<string, Role> = {
  user: ROLES.ADMIN,
  author: ROLES.ADMIN,
  approver: ROLES.HEAD_OF_SALES,
  guest: ROLES.SALES,
}

export function isValidRole(role: unknown): role is Role {
  return typeof role === 'string' && (ALL_ROLES as string[]).includes(role)
}

/**
 * Map a stored role onto the canonical vocabulary.
 * An unrecognised role becomes `null` rather than a default, so that garbage in the
 * column denies access instead of silently granting it.
 */
export function normalizeRole(role: string | null | undefined): Role | null {
  if (!role)
    return null

  if (isValidRole(role))
    return role

  return LEGACY_ROLE_ALIASES[role] ?? null
}

/**
 * Permissions, each mapped to the roles that hold it.
 *
 * `*.manage` permissions match a server-enforced rule: the corresponding write
 * endpoints are wrapped in `RequireRole(models.RoleAdmin)`.
 *
 * `*.view` permissions are UI-only. The server still allows every authenticated role
 * to read this data, because the mapping page loads the same records through the
 * dropdown endpoints. Gating the management screens is a navigation decision, not a
 * security boundary.
 */
export const PERMISSIONS = {
  'buildings.view': ALL_ROLES,
  'buildings.manage': [ROLES.ADMIN],

  'mapping.view': ALL_ROLES,

  'pois.view': ALL_ROLES,
  'pois.manage': [ROLES.ADMIN],

  'sales-packages.view': ALL_ROLES,
  'sales-packages.manage': [ROLES.ADMIN],

  'building-restrictions.view': [ROLES.ADMIN],
  'building-restrictions.manage': [ROLES.ADMIN],

  'master-data.view': [ROLES.ADMIN],
  'master-data.manage': [ROLES.ADMIN],
} as const satisfies Record<string, readonly Role[]>

export type Permission = keyof typeof PERMISSIONS

/** Whether `role` holds `permission`. A null/unknown role holds nothing. */
export function roleCan(role: Role | null, permission: Permission): boolean {
  if (!role)
    return false

  return (PERMISSIONS[permission] as readonly Role[]).includes(role)
}

/** Whether `role` is one of `allowed`. A null/unknown role never matches. */
export function roleHasAny(role: Role | null, allowed: readonly Role[]): boolean {
  if (!role)
    return false

  return allowed.includes(role)
}
