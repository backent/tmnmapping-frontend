import { describe, expect, it } from 'vitest'
import {
  WIZARD_STEPS,
  campaignYearOptions,
  defaultValidUntil,
  isStepReachable,
  selectedBuildings,
  toCalendarDate,
  weeklyBaseTotal,
} from '@/utils/quotationWizard'
import { indexPriceableBuildings } from '@/utils/buildingPicker'
import type { BuildingPrice } from '@/types/buildingprice'

function price(id: number, name: string, perWeek: number): BuildingPrice {
  return {
    id,
    building_id: id,
    building_name: name,
    building_iris_code: `IRIS-${id}`,
    building_type: 'Office',
    citytown: 'Jakarta',
    price_idr_per_week: perWeek,
    created_at: '',
    updated_at: '',
  }
}

const catalogue = new Map(indexPriceableBuildings([
  price(1, 'Menara Astra', 3_200_000),
  price(2, 'Green Bay', 2_400_000),
  price(3, 'Paskal Hyper', 1_000_000),
]).map(b => [b.building_id, b]))

describe('WIZARD_STEPS', () => {
  // Campaign stays a step of its own, between the pickers and the terms.
  it('keeps Campaign as its own step', () => {
    expect(WIZARD_STEPS).toEqual(['Client', 'Placement', 'Bonus', 'Campaign', 'Terms', 'Review'])
  })
})

describe('isStepReachable', () => {
  it('opens a new quotation up to the furthest step reached', () => {
    expect(isStepReachable(2, 2, false)).toBe(true)
    expect(isStepReachable(3, 2, false)).toBe(false)
  })

  it('opens every step of an existing quotation', () => {
    expect(isStepReachable(5, 0, true)).toBe(true)
  })
})

describe('selectedBuildings', () => {
  it('lists the selection in the order it was picked', () => {
    const list = selectedBuildings([2, 1], catalogue, new Set([1, 2]))

    expect(list.map(b => b.building_name)).toEqual(['Green Bay', 'Menara Astra'])
  })

  // The point of the panel: a filter must never hide a selection.
  it('keeps a selection the filter hides, and marks it', () => {
    const [hidden] = selectedBuildings([3], catalogue, new Set([1]))

    expect(hidden).toMatchObject({ building_name: 'Paskal Hyper', outsideFilter: true, unpriced: false })
  })

  it('keeps a selection that has lost its price, and marks it', () => {
    const [gone] = selectedBuildings([99], catalogue, new Set())

    expect(gone).toMatchObject({ building_name: 'Building #99', unpriced: true, outsideFilter: false, price_idr_per_week: 0 })
  })
})

describe('weeklyBaseTotal', () => {
  it('adds the weekly rates of the selection', () => {
    expect(weeklyBaseTotal(selectedBuildings([1, 2, 99], catalogue, new Set()))).toBe(5_600_000)
  })
})

describe('defaultValidUntil', () => {
  it('is 30 days on, as a local calendar date', () => {
    expect(defaultValidUntil(new Date(2026, 9, 17, 23, 30))).toBe('2026-11-16')
  })

  it('rolls over the year', () => {
    expect(defaultValidUntil(new Date(2026, 11, 15))).toBe('2027-01-14')
  })
})

describe('toCalendarDate', () => {
  it('pads month and day', () => {
    expect(toCalendarDate(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('campaignYearOptions', () => {
  it('offers last year through two years ahead', () => {
    expect(campaignYearOptions(2026)).toEqual([2025, 2026, 2027, 2028])
  })

  it('keeps a stored year outside that range', () => {
    expect(campaignYearOptions(2026, 2023)).toEqual([2023, 2025, 2026, 2027, 2028])
  })
})
