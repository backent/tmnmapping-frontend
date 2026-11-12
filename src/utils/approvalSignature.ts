/**
 * Approval signatures on the printed quotation (2026-11-12).
 */

import { ROLE_LABELS } from '@/config/roles'
import type { Role } from '@/config/roles'
import type { ApprovalEvent, ApprovalSignature } from '@/types/quotation'

interface Signed {
  approval_signature?: ApprovalSignature | null
  approvals?: ApprovalEvent[]
}

/**
 * The title printed under the approver's name: the job title copied at approval, or,
 * when none was set, the label of the role they approved as.
 */
export function signerTitle(quotation: Signed | null | undefined): string {
  const signature = quotation?.approval_signature
  if (!signature)
    return ''
  if (signature.job_title)
    return signature.job_title

  const approved = [...(quotation?.approvals ?? [])].reverse().find(a => a.action === 'approved')
  if (!approved)
    return ''

  return ROLE_LABELS[approved.actor_role as Role] ?? approved.actor_role
}
