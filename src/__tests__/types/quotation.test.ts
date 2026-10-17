import { describe, expect, it } from 'vitest'
import {
  PENDING_STATUS_FILTER,
  QUOTATION_STATUS_LABELS,
  approvalHintFor,
  isUnpriced,
  selectionPayloadFrom,
} from '@/types/quotation'
import type { QuotationStatus, Selection } from '@/types/quotation'

describe('approvalHintFor', () => {
  // The detail page used to pass an empty band, which the pricing card reads as
  // "Standard approval" -- so a quotation waiting on the CEO said standard.
  it.each([
    ['pending_manager', 'standard', 'head_of_sales'],
    ['pending_business_control', 'elevated', 'head_of_business_control'],
    ['pending_ceo', 'executive', 'ceo'],
  ] as const)('reads the band of %s from the status', (status, band, role) => {
    const hint = approvalHintFor({ status, required_approver_name: 'Rina Kusuma' })

    expect(hint).toMatchObject({ band, approver_role: role, approver_name: 'Rina Kusuma', resolvable: true })
  })

  it.each(['draft', 'returned', 'approved'] as const)('has no current approver when %s', status => {
    expect(approvalHintFor({ status, required_approver_name: 'Rina Kusuma' })).toBeNull()
  })
})

describe('isUnpriced', () => {
  it('treats only a draft as unpriced', () => {
    const statuses = Object.keys(QUOTATION_STATUS_LABELS) as QuotationStatus[]

    expect(statuses.filter(isUnpriced)).toEqual(['draft'])
  })
})

describe('PENDING_STATUS_FILTER', () => {
  // It is a filter the server expands, so it must never collide with a real status.
  it('is not itself a quotation status', () => {
    expect(Object.keys(QUOTATION_STATUS_LABELS)).not.toContain(PENDING_STATUS_FILTER)
  })
})

describe('selectionPayloadFrom', () => {
  const stored: Selection = {
    kind: 'placement',
    mode: 'building',
    sales_package_id: 0,
    sales_package_name: '',
    tvc_duration_seconds: 30,
    weeks: 4,
    spots: 360,
    gross_price_per_week: 6_400_000,
    gross_price: 25_600_000,
    traffic: 0,
    impressions: 0,
    screen_count: 2,
    items: [
      { building_id: 11, building_name: 'A', building_iris_code: 'X1', building_type: 'Office', citytown: 'Jakarta', unit_price_idr: 3_200_000, traffic: 0, impressions: 0 },
      { building_id: 12, building_name: 'B', building_iris_code: 'X2', building_type: 'Office', citytown: 'Jakarta', unit_price_idr: 3_200_000, traffic: 0, impressions: 0 },
    ],
  }

  // The payload carries what was chosen and never a price: the server prices it.
  it('keeps the choice and drops every figure', () => {
    expect(selectionPayloadFrom(stored)).toEqual({
      mode: 'building',
      building_ids: [11, 12],
      sales_package_id: 0,
      tvc_duration_seconds: 30,
      weeks: 4,
      spots: 360,
    })
  })
})
