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

/**
 * Roles that act on a quotation approval queue. `admin` is deliberately excluded.
 * Mirrors `services/quotation/roles.go`; move this alongside the quotation UI when
 * Phase 3 gives it a home.
 */
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
 * A permission key, as defined by the backend in `models/permission.go`.
 *
 * The frontend deliberately does not keep its own copy of which roles hold which
 * permission. `/current-user` returns the caller's permissions and the auth store
 * checks membership, so the policy is written in exactly one place and the two
 * halves of the app cannot drift apart.
 *
 * Keys ending in `.screen` are navigation-only: no route enforces them, they decide
 * which sections of the menu appear.
 */
export type Permission = string

/** Whether `role` is one of `allowed`. A null/unknown role never matches. */
export function roleHasAny(role: Role | null, allowed: readonly Role[]): boolean {
  if (!role)
    return false

  return allowed.includes(role)
}

/** Human-readable role names, for form selects and table chips. */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.SALES]: 'Sales',
  [ROLES.HEAD_OF_SALES]: 'Head of Sales',
  [ROLES.HEAD_OF_BUSINESS_CONTROL]: 'Head of Business Control',
  [ROLES.CEO]: 'CEO',
}

/** What each role is for, shown as a hint under the role select. */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  [ROLES.ADMIN]: 'Manages master data, the rate card and user accounts. Does not approve quotations.',
  [ROLES.SALES]: 'Creates and edits their own quotations.',
  [ROLES.HEAD_OF_SALES]: 'Approves discounts up to 65%, and may also own quotations.',
  [ROLES.HEAD_OF_BUSINESS_CONTROL]: 'Approves discounts above 65% and up to 75%.',
  [ROLES.CEO]: 'Approves discounts above 75%.',
}

export const ROLE_OPTIONS = ALL_ROLES.map(role => ({
  title: ROLE_LABELS[role],
  value: role,
}))

/**
 * Sales groups.
 *
 * Descriptive only. The reference spec defines this as "records whether a commercial
 * owner belongs to Sales Team, Everyone Can Be Sales, or Freelancer" and nothing in
 * the prototype reads it — customer visibility is scoped by `sales_assignments`
 * (customer + brand -> sales PIC), not by this field.
 */
export const SALES_GROUPS = {
  SALES_TEAM: 'sales_team',
  EVERYONE_SALES: 'everyone_sales',
  FREELANCER: 'freelancer',
} as const

export type SalesGroup = typeof SALES_GROUPS[keyof typeof SALES_GROUPS]

export const SALES_GROUP_LABELS: Record<SalesGroup, string> = {
  [SALES_GROUPS.SALES_TEAM]: 'Sales Team',
  [SALES_GROUPS.EVERYONE_SALES]: 'Everyone Sales',
  [SALES_GROUPS.FREELANCER]: 'Freelancer',
}

export const SALES_GROUP_OPTIONS = Object.values(SALES_GROUPS).map(group => ({
  title: SALES_GROUP_LABELS[group],
  value: group,
}))
