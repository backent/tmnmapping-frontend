import { describe, expect, it } from 'vitest'
import { brandOptionsFrom, customerOptionsFrom } from '@/utils/assignmentOptions'

const assignment = (customerId: number, customer: string, brandId: number, brand: string) => ({
  customer_id: customerId,
  customer_name: customer,
  customer_code: `C${customerId}`,
  brand_id: brandId,
  brand_name: brand,
  brand_code: `B${brandId}`,
})

const assignments = [
  assignment(2, 'Zeta Corp', 20, 'Zeta Cola'),
  assignment(1, 'Acme', 11, 'Acme Water'),
  assignment(1, 'Acme', 10, 'Acme Snacks'),
]

describe('customerOptionsFrom', () => {
  it('lists each assigned customer once, by name', () => {
    expect(customerOptionsFrom(assignments)).toEqual([
      { title: 'Acme (C1)', value: 1 },
      { title: 'Zeta Corp (C2)', value: 2 },
    ])
  })

  it('keeps an existing draft\'s customer even when its assignment expired', () => {
    const current = { customer_id: 9, customer_name: 'Old Co', brand_id: 90, brand_name: 'Old Brand' }

    expect(customerOptionsFrom([], current)).toEqual([{ title: 'Old Co', value: 9 }])
  })

  it('offers nothing when the seller holds no usable assignment', () => {
    expect(customerOptionsFrom([])).toEqual([])
  })
})

describe('brandOptionsFrom', () => {
  it('lists only the chosen customer\'s assigned brands', () => {
    expect(brandOptionsFrom(assignments, 1)).toEqual([
      { title: 'Acme Snacks (B10)', value: 10 },
      { title: 'Acme Water (B11)', value: 11 },
    ])
    expect(brandOptionsFrom(assignments, null)).toEqual([])
  })

  it('keeps the draft\'s brand under its own customer only', () => {
    const current = { customer_id: 1, customer_name: 'Acme', brand_id: 12, brand_name: 'Acme Juice' }

    expect(brandOptionsFrom(assignments, 1, current).map(o => o.value)).toEqual([12, 10, 11])
    expect(brandOptionsFrom(assignments, 2, current).map(o => o.value)).toEqual([20])
  })
})
