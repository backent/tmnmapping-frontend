/**
 * Campaign units for the quotation wizard.
 *
 * Every price in the system — a building's weekly rate and a sales package's alike —
 * buys ONE base unit for one week: a 15-second spot, shown 60 or 90 times per day per
 * screen (2026-11-15; it was 180). Both spot bases cost the base rate. A longer spot
 * multiplies the rate, and so does a higher frequency, counted on the base the seller
 * picks: 120 spots is 60 × 2, 270 is 90 × 3. A value both bases reach (180 is 60 × 3
 * or 90 × 2) is offered twice, so a selection carries its spots base.
 *
 * These mirror `services/quotation/pricing.go`. The server is the authority and
 * refuses anything off the ladder; this exists so the wizard can offer only the
 * values that will be accepted, and show what they cost before the seller commits.
 */

export const BASE_TVC_DURATION_SECONDS = 15
export const SPOTS_BASES = [60, 90] as const
export const MAX_UNIT_MULTIPLIER = 5

/** The spot base before 2026-11-15. Selections priced then still carry it. */
export const LEGACY_SPOTS_BASE = 180

function unitLadder(base: number): number[] {
  return Array.from({ length: MAX_UNIT_MULTIPLIER }, (_, i) => base * (i + 1))
}

export const TVC_DURATION_OPTIONS = unitLadder(BASE_TVC_DURATION_SECONDS)

/** One entry of the spots dropdown: a frequency and the base it is counted on. */
export interface SpotsChoice {
  spots: number
  base: number
}

/** Every frequency on either base, ascending; 180 appears once per base. */
export const SPOTS_CHOICES: SpotsChoice[] = SPOTS_BASES
  .flatMap(base => unitLadder(base).map(spots => ({ spots, base })))
  .sort((a, b) => a.spots - b.spots || a.base - b.base)

/** The distinct frequencies, for messages. */
export const SPOTS_OPTIONS = [...new Set(SPOTS_CHOICES.map(c => c.spots))]

/** How many base units a campaign value buys, or 0 if it is off the ladder. */
export function unitMultiplier(value: number, base: number): number {
  if (!Number.isInteger(value) || value <= 0 || base <= 0 || value % base !== 0)
    return 0

  const multiplier = value / base

  return multiplier > MAX_UNIT_MULTIPLIER ? 0 : multiplier
}

export function isSpotsBase(base: number): boolean {
  return (SPOTS_BASES as readonly number[]).includes(base)
}

/**
 * The base for a frequency that came without one (a selection saved before
 * 2026-11-15): 90 where both reach it, so 180 is 90 × 2, as the server does.
 */
export function inferSpotsBase(spots: number): number {
  return [90, 60].find(base => unitMultiplier(spots, base) > 0) ?? 0
}

/** The base to edit a stored selection on: its own, or the inferred one if it is legacy. */
export function editableSpotsBase(spots: number, base: number | undefined): number {
  return base !== undefined && isSpotsBase(base) ? base : inferSpotsBase(spots)
}

/** Spots multiplier on a base. Reads the legacy 180 base too, for display. */
export function spotsMultiplier(spots: number, base: number): number {
  return isSpotsBase(base) || base === LEGACY_SPOTS_BASE ? unitMultiplier(spots, base) : 0
}

/**
 * How much a selection's campaign multiplies the base rate: duration × spots.
 *
 * Weeks are deliberately absent. They multiply the price too, but a seller already
 * reads "4 weeks" as four times the weekly rate; what needs spelling out is that
 * 30 seconds and 180 spots on base 90 together cost four times as much, which nothing
 * on the form would otherwise say.
 */
export function rateMultiplier(durationSeconds: number, spots: number, spotsBase: number): number {
  return unitMultiplier(durationSeconds, BASE_TVC_DURATION_SECONDS)
    * (isSpotsBase(spotsBase) ? unitMultiplier(spots, spotsBase) : 0)
}

/** Label for a dropdown entry, e.g. "30s (×2)". The base unit says "base rate". */
export function durationLabel(seconds: number): string {
  const multiplier = unitMultiplier(seconds, BASE_TVC_DURATION_SECONDS)

  return multiplier === 1 ? `${seconds}s (base rate)` : `${seconds}s (×${multiplier})`
}

/** Label for a spots entry: "90 spots (base rate)", "180 spots (60 × 3)". */
export function spotsLabel(spots: number, base: number): string {
  const multiplier = spotsMultiplier(spots, base)

  if (multiplier === 1)
    return `${spots} spots (base rate)`

  return multiplier ? `${spots} spots (${base} × ${multiplier})` : `${spots} spots`
}

/** The dropdown value for a choice: one string, since 180 alone is ambiguous. */
export function spotsChoiceKey(spots: number, base: number): string {
  return `${spots}@${base}`
}

/** The choice a dropdown value stands for, or null if it is not one. */
export function parseSpotsChoice(key: string): SpotsChoice | null {
  return SPOTS_CHOICES.find(c => spotsChoiceKey(c.spots, c.base) === key) ?? null
}

/** The spots dropdown's items. */
export const SPOTS_DROPDOWN_ITEMS = SPOTS_CHOICES.map(c => ({
  title: spotsLabel(c.spots, c.base),
  value: spotsChoiceKey(c.spots, c.base),
}))

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
