import { describe, expect, it } from 'vitest'
import {
  approvalTrack,
  daysBetween,
  latestEvent,
  requiredApproverRole,
  waitingLabel,
} from '@/utils/quotationDetail'
import type { ApprovalEvent, QuotationStatus } from '@/types/quotation'

const event = (action: ApprovalEvent['action'], role: string, name: string, at: string, comment = ''): ApprovalEvent =>
  ({ version: 1, action, actor_role: role, actor_name: name, created_at: at, comment })

const submitted = event('submitted', 'sales', 'Dimas', '2026-10-15T03:00:00Z')

const quotation = (status: QuotationStatus, approvals: ApprovalEvent[] = [], version = 1) =>
  ({ status, approvals, version, required_approver_name: 'Rina Kusuma' })

const now = new Date(2026, 9, 17, 12, 0)

describe('latestEvent', () => {
  it('takes the newest event of the kinds asked for', () => {
    const first = event('returned', 'ceo', 'A', '2026-10-01T00:00:00Z', 'too deep')
    const second = event('returned', 'ceo', 'B', '2026-10-05T00:00:00Z', 'still too deep')

    expect(latestEvent([first, submitted, second], ['returned'])).toBe(second)
    expect(latestEvent([submitted], ['approved'])).toBeNull()
  })
})

describe('requiredApproverRole', () => {
  it.each([
    ['pending_manager', 'head_of_sales'],
    ['pending_business_control', 'head_of_business_control'],
    ['pending_ceo', 'ceo'],
  ] as const)('reads %s from the status', (status, role) => {
    expect(requiredApproverRole(quotation(status))).toBe(role)
  })

  // Once decided, the status no longer names the approver; whoever acted does.
  it('reads an approved or returned quotation from who decided it', () => {
    expect(requiredApproverRole(quotation('approved', [submitted, event('approved', 'ceo', 'Budi', '2026-10-16T00:00:00Z')]))).toBe('ceo')
    expect(requiredApproverRole(quotation('returned', [submitted, event('returned', 'head_of_sales', 'Budi', '2026-10-16T00:00:00Z')]))).toBe('head_of_sales')
  })

  it('reads a draft from the preview, and ignores anything that is not an approver', () => {
    expect(requiredApproverRole(quotation('draft'), 'head_of_business_control')).toBe('head_of_business_control')
    expect(requiredApproverRole(quotation('draft'), 'admin')).toBeNull()
    expect(requiredApproverRole(quotation('draft'))).toBeNull()
  })
})

describe('waitingLabel', () => {
  it('counts calendar days', () => {
    expect(waitingLabel(new Date(2026, 9, 17, 8).toISOString(), now)).toBe('waiting since today')
    expect(waitingLabel(new Date(2026, 9, 16, 23).toISOString(), now)).toBe('waiting 1 day')
    expect(waitingLabel(new Date(2026, 9, 14, 9).toISOString(), now)).toBe('waiting 3 days')
  })

  it('never counts backwards', () => {
    expect(daysBetween(new Date(2026, 9, 20).toISOString(), now)).toBe(0)
  })
})

describe('approvalTrack', () => {
  const states = (status: QuotationStatus, approvals: ApprovalEvent[], draftRole?: string) =>
    approvalTrack(quotation(status, approvals), draftRole, now).map(s => `${s.key}:${s.state}`)

  // One approver is needed; the tracker says so by dimming the other two.
  it('waits on the one approver the discount needs', () => {
    expect(states('pending_business_control', [submitted])).toEqual([
      'submitted:done',
      'head_of_sales:skipped',
      'head_of_business_control:current',
      'ceo:skipped',
      'approved:todo',
    ])
  })

  it('names who it is waiting on and for how long', () => {
    const step = approvalTrack(quotation('pending_ceo', [submitted]), null, now).find(s => s.key === 'ceo')

    expect(step?.detail).toBe('Rina Kusuma · waiting 2 days')
  })

  it('marks an approved quotation done end to end', () => {
    expect(states('approved', [submitted, event('approved', 'head_of_sales', 'Budi', '2026-10-16T02:00:00Z')])).toEqual([
      'submitted:done',
      'head_of_sales:done',
      'head_of_business_control:skipped',
      'ceo:skipped',
      'approved:done',
    ])
  })

  it('marks where a returned quotation was sent back', () => {
    const track = approvalTrack(quotation('returned', [submitted, event('returned', 'ceo', 'Budi', '2026-10-16T02:00:00Z', 'too deep')]), null, now)

    expect(track.find(s => s.key === 'ceo')).toMatchObject({ state: 'returned', detail: 'Returned by Budi · 16 Oct' })
  })

  it('rules no approver out before it knows which one is needed', () => {
    expect(states('draft', [])).toEqual([
      'submitted:current',
      'head_of_sales:todo',
      'head_of_business_control:todo',
      'ceo:todo',
      'approved:todo',
    ])
  })

  it('shows a draft as not yet submitted, with who would approve it', () => {
    expect(states('draft', [], 'head_of_sales')).toEqual([
      'submitted:current',
      'head_of_sales:todo',
      'head_of_business_control:skipped',
      'ceo:skipped',
      'approved:todo',
    ])
  })
})
