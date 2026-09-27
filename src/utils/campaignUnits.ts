/**
 * Campaign units for the quotation wizard.
 *
 * Every price in the system — a building's weekly rate and a sales package's alike —
 * buys ONE base unit: a 15-second spot, shown 180 times per day per screen, for one
 * week. A longer spot or a higher frequency is a multiple of that unit and multiplies
 * the rate.
 *
 * These mirror `services/quotation/pricing.go`. The server is the authority and
 * refuses anything off the ladder; this exists so the wizard can offer only the
 * values that will be accepted, and show what they cost before the seller commits.
 */

export const BASE_TVC_DURATION_SECONDS = 15
export const BASE_SPOTS_PER_DAY = 180
export const MAX_UNIT_MULTIPLIER = 5

function unitLadder(base: number): number[] {
  return Array.from({ length: MAX_UNIT_MULTIPLIER }, (_, i) => base * (i + 1))
}

export const TVC_DURATION_OPTIONS = unitLadder(BASE_TVC_DURATION_SECONDS)
export const SPOTS_OPTIONS = unitLadder(BASE_SPOTS_PER_DAY)

/** How many base units a campaign value buys, or 0 if it is off the ladder. */
export function unitMultiplier(value: number, base: number): number {
  if (!Number.isInteger(value) || value <= 0 || base <= 0 || value % base !== 0)
    return 0

  const multiplier = value / base

  return multiplier > MAX_UNIT_MULTIPLIER ? 0 : multiplier
}

/**
 * How much a selection's campaign multiplies the base rate: duration × spots.
 *
 * Weeks are deliberately absent. They multiply the price too, but a seller already
 * reads "4 weeks" as four times the weekly rate; what needs spelling out is that
 * 30 seconds and 360 spots together cost four times as much, which nothing on the
 * form would otherwise say.
 */
export function rateMultiplier(durationSeconds: number, spots: number): number {
  return unitMultiplier(durationSeconds, BASE_TVC_DURATION_SECONDS)
    * unitMultiplier(spots, BASE_SPOTS_PER_DAY)
}

/** Label for a dropdown entry, e.g. "30s (×2)". The base unit says "base rate". */
export function durationLabel(seconds: number): string {
  const multiplier = unitMultiplier(seconds, BASE_TVC_DURATION_SECONDS)

  return multiplier === 1 ? `${seconds}s (base rate)` : `${seconds}s (×${multiplier})`
}

/** Label for a spots entry, e.g. "360 spots (×2)". */
export function spotsLabel(spots: number): string {
  const multiplier = unitMultiplier(spots, BASE_SPOTS_PER_DAY)

  return multiplier === 1 ? `${spots} spots (base rate)` : `${spots} spots (×${multiplier})`
}

/**
 * Coerce a campaign number into something safe to send.
 *
 * `v-model.number` on an empty field yields `''`, not 0 (Vue's `looseToNumber`
 * returns the original string when it cannot parse). That empty string reaches a Go
 * `int` and fails to unmarshal, which surfaces as a 500 rather than a validation
 * message — so nothing leaves the form until it is a whole positive number.
 */
export function toCampaignNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0
}
