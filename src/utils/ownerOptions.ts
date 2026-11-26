/**
 * Sales PIC and quotation owner pickers (2026-11-15).
 *
 * Any user can be a brand's PIC, and so own its quotations, so the pickers list
 * everyone, with their role: the role decides the approval track.
 */

import { ROLE_LABELS } from '@/config/roles'
import type { Role } from '@/config/roles'
import { trackForOwnerRole } from '@/types/quotation'
import type { QuotationOwner } from '@/types/user'

/** "Ayu Lestari (ayu) · Head of Sales". */
export function ownerLabel(owner: QuotationOwner): string {
  const role = ROLE_LABELS[owner.role as Role] ?? owner.role

  return role ? `${owner.name} (${owner.username}) · ${role}` : `${owner.name} (${owner.username})`
}

/** Shown when the chosen PIC is outside sales, so their quotations skip Head of Sales. */
export const EXECUTIVE_TRACK_NOTE
  = 'Not a sales role: quotations owned by this person skip Head of Sales and go to '
  + 'Business Control (below 70%) or the CEO (70% and above).'

/** The note for a chosen owner, or '' when they are on the sales track or unknown. */
export function ownerTrackNote(owner: Pick<QuotationOwner, 'role'> | null | undefined): string {
  if (!owner)
    return ''

  return trackForOwnerRole(owner.role) === 'executive' ? EXECUTIVE_TRACK_NOTE : ''
}
