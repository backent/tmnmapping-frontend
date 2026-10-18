/**
 * What the quotation detail page reads off a quotation's status and history.
 *
 * Kept out of the component so the rules can be tested: which approver the
 * quotation needs, where it is with them, and who sent it back.
 */
import { APPROVER_ROLE_LABELS, isPending } from '@/types/quotation'
import type { ApprovalEvent, Quotation, QuotationStatus } from '@/types/quotation'

const APPROVER_ROLES = ['head_of_sales', 'head_of_business_control', 'ceo'] as const

type ApproverRole = typeof APPROVER_ROLES[number]

const ROLE_FOR_STATUS: Partial<Record<QuotationStatus, ApproverRole>> = {
  pending_manager: 'head_of_sales',
  pending_business_control: 'head_of_business_control',
  pending_ceo: 'ceo',
}

/** The newest event of one of these kinds, or null. History arrives oldest first. */
export function latestEvent(
  approvals: ApprovalEvent[],
  actions: ApprovalEvent['action'][],
): ApprovalEvent | null {
  for (let i = approvals.length - 1; i >= 0; i--) {
    if (actions.includes(approvals[i].action))
      return approvals[i]
  }

  return null
}

/**
 * The approver this quotation needs.
 *
 * Routing sends a quotation to exactly one approver, chosen by its discount band and
 * moved up one level when the owner would otherwise approve their own quotation. A
 * pending status names that approver. Once someone has approved or returned it the
 * status no longer does, so the role is read from who acted. A draft has not been
 * routed; the wizard's preview says who it would go to.
 */
export function requiredApproverRole(
  quotation: Pick<Quotation, 'status' | 'approvals'>,
  draftApproverRole?: string | null,
): ApproverRole | null {
  const fromStatus = ROLE_FOR_STATUS[quotation.status]
  if (fromStatus)
    return fromStatus

  if (quotation.status === 'approved' || quotation.status === 'returned') {
    const decision = latestEvent(quotation.approvals, [quotation.status === 'approved' ? 'approved' : 'returned'])
    const role = decision?.actor_role

    return (APPROVER_ROLES as readonly string[]).includes(role ?? '') ? role as ApproverRole : null
  }

  return (APPROVER_ROLES as readonly string[]).includes(draftApproverRole ?? '')
    ? draftApproverRole as ApproverRole
    : null
}

export type TrackState = 'done' | 'current' | 'returned' | 'todo' | 'skipped'

export interface TrackStep {
  key: string
  label: string
  state: TrackState
  detail: string
}

/** Whole calendar days from one moment to another, never negative. */
export function daysBetween(from: string, now: Date = new Date()): number {
  const start = new Date(from)
  if (Number.isNaN(start.getTime()))
    return 0

  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

  return Math.max(0, Math.round((day(now) - day(start)) / 86_400_000))
}

/** "waiting since today", "waiting 1 day", "waiting 3 days". */
export function waitingLabel(since: string | undefined, now: Date = new Date()): string {
  if (!since)
    return 'waiting'

  const days = daysBetween(since, now)

  if (days === 0)
    return 'waiting since today'

  return `waiting ${days} ${days === 1 ? 'day' : 'days'}`
}

const shortDate = (value: string) => {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(date)
}

/**
 * The approval tracker: Submitted, the three approver roles, Approved.
 *
 * Only one approver role is ever needed, so the other two read "Not needed" and are
 * dimmed. That is the point of drawing all three: the seller sees which level the
 * discount reached, and that it did not need the others.
 */
export function approvalTrack(
  quotation: Pick<Quotation, 'status' | 'approvals' | 'version' | 'required_approver_name'>,
  draftApproverRole?: string | null,
  now: Date = new Date(),
): TrackStep[] {
  const role = requiredApproverRole(quotation, draftApproverRole)
  const submitted = latestEvent(quotation.approvals, ['submitted', 'resubmitted'])
  const decision = latestEvent(quotation.approvals, ['approved', 'returned'])
  const isDraft = quotation.status === 'draft'

  const steps: TrackStep[] = [{
    key: 'submitted',
    label: 'Submitted',
    state: isDraft ? 'current' : 'done',
    detail: isDraft
      ? 'Not yet'
      : submitted
        ? `${submitted.actor_name} · ${shortDate(submitted.created_at)}${quotation.version > 1 ? ` · v${quotation.version}` : ''}`
        : '',
  }]

  for (const approver of APPROVER_ROLES) {
    const label = APPROVER_ROLE_LABELS[approver]

    // Not known yet (a draft whose preview has not loaded): no role is ruled out.
    if (role === null) {
      steps.push({ key: approver, label, state: 'todo', detail: '' })
      continue
    }

    if (approver !== role) {
      steps.push({ key: approver, label, state: 'skipped', detail: 'Not needed' })
      continue
    }

    if (isPending(quotation.status)) {
      steps.push({
        key: approver,
        label,
        state: 'current',
        detail: [quotation.required_approver_name, waitingLabel(submitted?.created_at, now)].filter(Boolean).join(' · '),
      })
    }
    else if (quotation.status === 'approved') {
      steps.push({ key: approver, label, state: 'done', detail: decision ? `${decision.actor_name} · ${shortDate(decision.created_at)}` : '' })
    }
    else if (quotation.status === 'returned') {
      steps.push({ key: approver, label, state: 'returned', detail: decision ? `Returned by ${decision.actor_name} · ${shortDate(decision.created_at)}` : 'Returned' })
    }
    else {
      steps.push({ key: approver, label, state: 'todo', detail: 'Would approve' })
    }
  }

  steps.push({
    key: 'approved',
    label: 'Approved',
    state: quotation.status === 'approved' ? 'done' : 'todo',
    detail: quotation.status === 'approved' && decision ? shortDate(decision.created_at) : '',
  })

  return steps
}
