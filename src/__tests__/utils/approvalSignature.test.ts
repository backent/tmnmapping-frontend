import { describe, expect, it } from 'vitest'
import { signerTitle } from '@/utils/approvalSignature'
import type { ApprovalEvent } from '@/types/quotation'

// Approval signatures on the printed quotation (2026-11-12).

const event = (action: ApprovalEvent['action'], role: string): ApprovalEvent => ({
  version: 1, actor_name: 'X', actor_role: role, action, comment: '', created_at: '2026-11-12',
})

describe('signerTitle', () => {
  it('prints the job title copied at approval', () => {
    expect(signerTitle({
      approval_signature: { name: 'Thomas', job_title: 'Chief Executive Officer', has_signature: true },
      approvals: [event('approved', 'ceo')],
    })).toBe('Chief Executive Officer')
  })

  it('falls back to the label of the role the approver approved as', () => {
    expect(signerTitle({
      approval_signature: { name: 'Ayu', job_title: '', has_signature: true },
      approvals: [event('submitted', 'sales'), event('returned', 'ceo'), event('approved', 'head_of_sales')],
    })).toBe('Head of Sales')
  })

  it('prints nothing before approval or without an approval record', () => {
    expect(signerTitle({ approval_signature: null, approvals: [event('submitted', 'sales')] })).toBe('')
    expect(signerTitle({ approval_signature: { name: 'A', job_title: '', has_signature: false }, approvals: [] })).toBe('')
    expect(signerTitle(null)).toBe('')
  })
})
