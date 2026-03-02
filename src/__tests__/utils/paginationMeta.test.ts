import { describe, expect, it } from 'vitest'
import { paginationMeta } from '@/utils/paginationMeta'

describe('paginationMeta', () => {
  it('shows correct range for page 1 with full page of items', () => {
    expect(paginationMeta({ page: 1, itemsPerPage: 10 }, 100))
      .toBe('Showing 1 to 10 of 100 entries')
  })

  it('shows correct range for page 2', () => {
    expect(paginationMeta({ page: 2, itemsPerPage: 10 }, 100))
      .toBe('Showing 11 to 20 of 100 entries')
  })

  it('shows correct range for the last full page', () => {
    expect(paginationMeta({ page: 10, itemsPerPage: 10 }, 100))
      .toBe('Showing 91 to 100 of 100 entries')
  })

  it('caps the end at total when the last page is partial', () => {
    expect(paginationMeta({ page: 10, itemsPerPage: 10 }, 95))
      .toBe('Showing 91 to 95 of 95 entries')
  })

  it('shows "Showing 0 to 0" when total is 0', () => {
    expect(paginationMeta({ page: 1, itemsPerPage: 10 }, 0))
      .toBe('Showing 0 to 0 of 0 entries')
  })

  it('works with itemsPerPage of 25', () => {
    expect(paginationMeta({ page: 1, itemsPerPage: 25 }, 50))
      .toBe('Showing 1 to 25 of 50 entries')
  })

  it('works with itemsPerPage of 25 on page 2', () => {
    expect(paginationMeta({ page: 2, itemsPerPage: 25 }, 50))
      .toBe('Showing 26 to 50 of 50 entries')
  })

  it('works with a single item', () => {
    expect(paginationMeta({ page: 1, itemsPerPage: 10 }, 1))
      .toBe('Showing 1 to 1 of 1 entries')
  })

  it('accepts extra properties on the options object (generic constraint)', () => {
    expect(paginationMeta({ page: 1, itemsPerPage: 5, search: 'test' }, 15))
      .toBe('Showing 1 to 5 of 15 entries')
  })
})
