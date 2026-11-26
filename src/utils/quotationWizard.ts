/**
 * Rules for the quotation wizard that do not need a component to test.
 *
 * The server is still the authority on every one of them: these decide what the
 * wizard offers, not what is accepted.
 */
import type { PriceableBuilding } from '@/utils/buildingPicker'

/**
 * Campaign keeps its own step rather than sitting under each picker: the seller
 * chooses where first, then sets duration, frequency and weeks for both lines side
 * by side.
 */
export const WIZARD_STEPS = ['Client', 'Placement', 'Bonus', 'Campaign', 'Terms', 'Review'] as const

/**
 * Whether the stepper lets the seller jump to a step.
 *
 * A new quotation opens each step in order, then any step already reached stays
 * open. An existing quotation was valid when saved, so every step is open at once:
 * changing only the discount should not mean clicking Next four times.
 */
export function isStepReachable(index: number, furthest: number, isEdit: boolean): boolean {
  return isEdit || index <= furthest
}

export interface SelectedBuilding {
  building_id: number
  building_name: string
  price_idr_per_week: number

  /** Selected, but hidden by the current search or filters. */
  outsideFilter: boolean

  /** Selected, but no longer has a price, so it cannot be quoted. */
  unpriced: boolean
}

/**
 * The selected-buildings panel, in the order they were picked.
 *
 * Every selected building is listed, including ones the current filter hides, so a
 * selection never goes out of sight. A building selected earlier whose price has
 * since been removed is listed too and marked, rather than silently dropped; the
 * server refuses it on save, and the seller should see why.
 */
export function selectedBuildings(
  selectedIds: number[],
  catalogue: Map<number, PriceableBuilding>,
  visibleIds: Set<number>,
): SelectedBuilding[] {
  return selectedIds.map(id => {
    const building = catalogue.get(id)

    return {
      building_id: id,
      building_name: building?.building_name ?? `Building #${id}`,
      price_idr_per_week: building?.price_idr_per_week ?? 0,
      outsideFilter: !!building && !visibleIds.has(id),
      unpriced: !building,
    }
  })
}

/**
 * The selection's weekly rate before campaign multipliers, weeks or discount.
 *
 * Shown under the panel as a running figure while picking. The pricing card has the
 * real number, priced by the server.
 */
export function weeklyBaseTotal(selected: SelectedBuilding[]): number {
  return selected.reduce((sum, b) => sum + b.price_idr_per_week, 0)
}

const pad = (n: number) => String(n).padStart(2, '0')

/** A local date as YYYY-MM-DD, the shape the API takes for valid_until. */
export function toCalendarDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * The validity a new quotation starts with: the server's default of 30 days, shown
 * in the form so the seller sees the date that will print instead of discovering it
 * on the document.
 */
export const DEFAULT_VALIDITY_DAYS = 30

export function defaultValidUntil(today: Date = new Date()): string {
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + DEFAULT_VALIDITY_DAYS)

  return toCalendarDate(date)
}

/**
 * Campaign years on offer: last year (a late quotation for a running campaign)
 * through two years ahead. A stored year outside that range is kept so editing an
 * old quotation never changes it by accident.
 */
export function campaignYearOptions(currentYear: number, stored?: number): number[] {
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  if (stored && !years.includes(stored))
    years.push(stored)

  return years.sort((a, b) => a - b)
}
