import { describe, expect, it } from 'vitest'
import {
  APPROVAL_BANDS,
  DISCOUNT_THRESHOLDS,
  PENDING_STATUS_FILTER,
  QUOTATION_STATUS_LABELS,
  approvalHintFor,
  campaignSummary,
  discountBandColor,
  formatIdrCompact,
  isUnpriced,
  selectionPayloadFrom,
} from '@/types/quotation'
import type { CampaignLine, QuotationStatus, Selection } from '@/types/quotation'

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

describe('campaignSummary', () => {
  const placement: CampaignLine = { kind: 'placement', mode: 'building', package_name: '', building_count: 42, weeks: 4 }

  it('names the placement and its weeks, and says when there is no bonus', () => {
    expect(campaignSummary([placement])).toEqual({ main: '42 buildings · 4 wk', sub: 'No bonus' })
  })

  it('names a package placement and a building bonus', () => {
    expect(campaignSummary([
      { kind: 'placement', mode: 'package', package_name: 'Jakarta CBD', building_count: 0, weeks: 8 },
      { kind: 'bonus', mode: 'building', package_name: '', building_count: 1, weeks: 2 },
    ])).toEqual({ main: 'Package: Jakarta CBD · 8 wk', sub: '+ bonus 1 building' })
  })

  it('says when nothing is selected', () => {
    expect(campaignSummary([])).toEqual({ main: 'Nothing selected yet', sub: '' })
    expect(campaignSummary(undefined)).toEqual({ main: 'Nothing selected yet', sub: '' })
  })
})

describe('approval bands', () => {
  // The dot in the list, the meter in the wizard and the label on the pricing card
  // all read the same thresholds, so they cannot disagree about a boundary.
  it('colours a discount by the same thresholds the band labels name', () => {
    expect(discountBandColor(DISCOUNT_THRESHOLDS.standard)).toBe(APPROVAL_BANDS.standard.color)
    expect(discountBandColor(DISCOUNT_THRESHOLDS.elevated)).toBe(APPROVAL_BANDS.elevated.color)
    expect(discountBandColor(DISCOUNT_THRESHOLDS.elevated + 1)).toBe(APPROVAL_BANDS.executive.color)
  })

  it('names each band with its range in words', () => {
    expect(APPROVAL_BANDS.standard.range).toBe('up to 65%')
    expect(APPROVAL_BANDS.elevated.range).toBe('65 to 75%')
    expect(APPROVAL_BANDS.executive.range).toBe('above 75%')
  })
})

describe('formatIdrCompact', () => {
  // Intl separates the currency with a no-break space; compare on plain spaces.
  const plain = (value: number) => formatIdrCompact(value).replace(/\s/g, ' ')

  it('shortens millions and billions the Indonesian way', () => {
    expect(plain(420_201_600)).toBe('Rp 420,2 jt')
    expect(plain(1_154_400_000)).toBe('Rp 1,2 M')
  })
})
