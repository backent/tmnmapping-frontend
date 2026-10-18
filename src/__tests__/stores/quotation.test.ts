import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuotationStore } from '@/stores/quotation'
import { discountBandColor, formatIdr, isPending } from '@/types/quotation'
import type { Pricing, Quotation } from '@/types/quotation'

import {
  approveQuotation,
  getDashboardCounts,
  getQuotations,
  previewPricing,
  returnQuotation,
  submitQuotation,
} from '@/http/quotation'

vi.mock('@/http/quotation', () => ({
  getQuotations: vi.fn(),
  getQuotationById: vi.fn(),
  createQuotation: vi.fn(),
  updateQuotation: vi.fn(),
  deleteQuotation: vi.fn(),
  submitQuotation: vi.fn(),
  approveQuotation: vi.fn(),
  returnQuotation: vi.fn(),
  previewPricing: vi.fn(),
  getDashboardCounts: vi.fn(),
}))

// The real quotation template's figures, so the store tests use the same numbers
// the backend pricing is verified against.
const realPricing: Pricing = {
  placement_gross: 1_520_000_000,
  placement_discount_amount: 988_000_000,
  placement_net: 532_000_000,
  bonus_gross: 280_000_000,
  bonus_net: 0,
  total_gross: 1_800_000_000,
  total_net: 532_000_000,
  effective_discount_amount: 1_268_000_000,
  effective_discount_rate: 70.44,
  tax: 58_520_000,
  total_including_tax: 590_520_000,
}

const draft = {
  id: 1, quote_number: 'Q-2026-0001', status: 'draft', is_editable: true, version: 1,
  pricing: realPricing, selections: [], approvals: [],
} as unknown as Quotation

describe('useQuotationStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('isCurrentEditable', () => {
    it('follows the server flag rather than re-deriving it from status', () => {
      const store = useQuotationStore()

      store.currentItem = draft
      expect(store.isCurrentEditable).toBe(true)

      store.currentItem = { ...draft, status: 'pending_manager', is_editable: false }
      expect(store.isCurrentEditable).toBe(false)
    })

    it('is false when nothing is loaded', () => {
      expect(useQuotationStore().isCurrentEditable).toBe(false)
    })
  })

  describe('refreshPreview', () => {
    // Pricing is deliberately server-side. Reproducing the formula in the browser
    // would create a second source of truth that could drift from what is charged.
    it('stores what the server returned', async () => {
      vi.mocked(previewPricing).mockResolvedValue({
        data: {
          pricing: realPricing,
          approval: { band: 'elevated', approver_role: 'head_of_business_control', approver_name: 'April', resolvable: true, reason: '' },
          sections: [],
        },
      } as any)

      const store = useQuotationStore()

      const preview = await store.refreshPreview({
        discount: 65,
        placement: { mode: 'building', building_ids: [1], tvc_duration_seconds: 15, weeks: 4, spots: 180 },
      })

      expect(preview?.pricing.total_including_tax).toBe(590_520_000)
      expect(preview?.approval.approver_name).toBe('April')
      expect(store.isPreviewing).toBe(false)
    })

    it('does not call the server with nothing selected', async () => {
      const store = useQuotationStore()

      expect(await store.refreshPreview({ discount: 50 })).toBeNull()
      expect(previewPricing).not.toHaveBeenCalled()
    })

    // A wrong price on screen is worse than no price, so a failure clears the
    // preview rather than leaving a stale figure visible.
    it('clears the preview when pricing fails', async () => {
      vi.mocked(previewPricing).mockRejectedValue({ status: 400, details: { data: 'no rate card' } })

      const store = useQuotationStore()

      store.preview = { pricing: realPricing, approval: {} as any, sections: [] }

      await expect(store.refreshPreview({
        discount: 50,
        placement: { mode: 'building', building_ids: [1], tvc_duration_seconds: 15, weeks: 4, spots: 180 },
      })).rejects.toBeDefined()

      expect(store.preview).toBeNull()
      expect(store.isPreviewing).toBe(false)
    })
  })

  describe('approval actions', () => {
    it('replaces the current item after approving', async () => {
      vi.mocked(approveQuotation).mockResolvedValue({
        data: { ...draft, status: 'approved', is_editable: false },
      } as any)

      const store = useQuotationStore()

      store.currentItem = draft
      await store.approve(1)

      expect(store.currentItem?.status).toBe('approved')
      expect(store.isSubmitting).toBe(false)
    })

    it('clears the submitting flag when a return is refused', async () => {
      vi.mocked(returnQuotation).mockRejectedValue({ status: 400, details: { data: 'reason required' } })

      const store = useQuotationStore()

      await expect(store.returnToSales(1, '')).rejects.toBeDefined()
      expect(store.isSubmitting).toBe(false)
    })

    it('clears the submitting flag when submit is refused', async () => {
      vi.mocked(submitQuotation).mockRejectedValue({ status: 400, details: { data: 'no approver' } })

      const store = useQuotationStore()

      await expect(store.submit(1)).rejects.toBeDefined()
      expect(store.isSubmitting).toBe(false)
    })
  })

  describe('list and counts', () => {
    it('derives pagination from extras', async () => {
      vi.mocked(getQuotations).mockResolvedValue({
        data: [draft], extras: { take: 10, skip: 20, total: 35 },
      } as any)

      const store = useQuotationStore()

      await store.fetchList({ take: 10, skip: 20 })

      expect(store.pagination).toEqual({ currentPage: 3, lastPage: 4, perPage: 10, total: 35 })
    })

    it('stores dashboard counts', async () => {
      vi.mocked(getDashboardCounts).mockResolvedValue({
        data: { draft: 2, pending: 5, returned: 1, approved: 3, all: 11 },
      } as any)

      const store = useQuotationStore()

      await store.fetchCounts()

      expect(store.counts.pending).toBe(5)
      expect(store.counts.all).toBe(11)
    })
  })
})

describe('quotation helpers', () => {
  it('treats all three pending statuses as pending', () => {
    expect(isPending('pending_manager')).toBe(true)
    expect(isPending('pending_business_control')).toBe(true)
    expect(isPending('pending_ceo')).toBe(true)
    expect(isPending('draft')).toBe(false)
    expect(isPending('approved')).toBe(false)
    expect(isPending('returned')).toBe(false)
  })

  // Mirrors the backend bands: <=65 standard, <=75 elevated, above that executive.
  it('colours the discount band at the same boundaries as the server', () => {
    expect(discountBandColor(65)).toBe('success')
    expect(discountBandColor(65.01)).toBe('warning')
    expect(discountBandColor(75)).toBe('warning')
    expect(discountBandColor(75.01)).toBe('error')
  })

  it('renders whole rupiah', () => {
    const formatted = formatIdr(590_520_000)

    expect(formatted).toContain('590')
    expect(formatted).not.toMatch(/[.,]\d{2}$/)
  })

  it('handles a missing amount', () => {
    expect(formatIdr(0)).toContain('0')
  })
})
