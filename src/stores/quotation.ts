import { defineStore } from 'pinia'
import {
  approveQuotation,
  createQuotation,
  deleteQuotation,
  getDashboardCounts,
  getQuotationById,
  getQuotations,
  previewPricing,
  returnQuotation,
  submitQuotation,
  updateQuotation,
} from '@/http/quotation'
import type { QuotationListParams } from '@/http/quotation'
import type {
  DashboardCounts,
  PricingPreview,
  Quotation,
  QuotationPayload,
  SelectionPayload,
} from '@/types/quotation'

interface QuotationState {
  items: Quotation[]
  currentItem: Quotation | null
  counts: DashboardCounts
  preview: PricingPreview | null
  isLoading: boolean
  isPreviewing: boolean
  isSubmitting: boolean
  pagination: { currentPage: number; lastPage: number; perPage: number; total: number }
}

export const useQuotationStore = defineStore('quotation', {
  state: (): QuotationState => ({
    items: [],
    currentItem: null,
    counts: { draft: 0, pending: 0, returned: 0, approved: 0, all: 0 },
    preview: null,
    isLoading: false,
    isPreviewing: false,
    isSubmitting: false,
    pagination: { currentPage: 1, lastPage: 1, perPage: 10, total: 0 },
  }),

  getters: {
    /** Only a draft or a returned quotation can be changed. */
    isCurrentEditable: (state): boolean => state.currentItem?.is_editable === true,
  },

  actions: {
    async fetchList(params?: QuotationListParams) {
      this.isLoading = true
      try {
        const response = await getQuotations(params)

        this.items = response.data || []

        const take = response.extras?.take || params?.take || 10
        const skip = response.extras?.skip ?? params?.skip ?? 0
        const total = response.extras?.total ?? this.items.length

        this.pagination = {
          currentPage: Math.floor(skip / take) + 1,
          lastPage: Math.ceil(total / take) || 1,
          perPage: take,
          total,
        }

        return response
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchCounts() {
      const response = await getDashboardCounts()

      this.counts = response.data || this.counts

      return this.counts
    },

    async fetchById(id: number) {
      this.isLoading = true
      try {
        const response = await getQuotationById(id)

        this.currentItem = response.data || null

        return response
      }
      finally {
        this.isLoading = false
      }
    },

    async create(payload: QuotationPayload) {
      this.isSubmitting = true
      try {
        const response = await createQuotation(payload)

        this.currentItem = response.data || null

        return response
      }
      finally {
        this.isSubmitting = false
      }
    },

    async update(id: number, payload: QuotationPayload) {
      this.isSubmitting = true
      try {
        const response = await updateQuotation(id, payload)

        this.currentItem = response.data || null

        return response
      }
      finally {
        this.isSubmitting = false
      }
    },

    async remove(id: number) {
      await deleteQuotation(id)
      this.items = this.items.filter(item => item.id !== id)
    },

    async submit(id: number) {
      this.isSubmitting = true
      try {
        const response = await submitQuotation(id)

        this.currentItem = response.data || this.currentItem

        return response
      }
      finally {
        this.isSubmitting = false
      }
    },

    async approve(id: number) {
      this.isSubmitting = true
      try {
        const response = await approveQuotation(id)

        this.currentItem = response.data || this.currentItem

        return response
      }
      finally {
        this.isSubmitting = false
      }
    },

    async returnToSales(id: number, comment: string) {
      this.isSubmitting = true
      try {
        const response = await returnQuotation(id, comment)

        this.currentItem = response.data || this.currentItem

        return response
      }
      finally {
        this.isSubmitting = false
      }
    },

    /**
     * Ask the server to price the current selection.
     *
     * Deliberately server-side: reproducing the formula in the browser would create
     * a second source of truth that could drift from what is actually charged.
     * A failure clears the preview rather than leaving a stale figure on screen,
     * because a wrong price is worse than no price.
     */
    async refreshPreview(payload: {
      discount: number
      tax_rate?: number
      placement?: SelectionPayload | null
      bonus?: SelectionPayload | null
    }) {
      if (!payload.placement && !payload.bonus) {
        this.preview = null

        return null
      }

      this.isPreviewing = true
      try {
        const response = await previewPricing(payload)

        this.preview = response.data || null

        return this.preview
      }
      catch (error) {
        this.preview = null
        throw error
      }
      finally {
        this.isPreviewing = false
      }
    },

    clearPreview() {
      this.preview = null
    },

    clearCurrent() {
      this.currentItem = null
      this.preview = null
    },
  },
})
