/**
 * VAT is entered and shown as a percentage (11 means 11%), but the API and the
 * database store it as a fraction (0.11). The conversion happens only here, at the
 * edge of the form, so the payload and every stored quotation keep their existing
 * meaning.
 *
 * The database column is NUMERIC(5,4): four decimal places as a fraction, which is
 * two as a percentage. Values are rounded to that, so 12.345% is stored as 12.35%
 * rather than truncated by the database.
 */

/** Indonesian PPN, matching the backend's DefaultTaxRate of 0.11. */
export const DEFAULT_VAT_PERCENT = 11

/** 0.11 → 11. Rounded to two decimals so float noise such as 11.000000000000002 never shows. */
export function vatRateToPercent(rate: number): number {
  return Math.round((Number(rate) || 0) * 10000) / 100
}

/**
 * 11 → 0.11, or null when the input is not a usable percentage.
 *
 * Zero is refused along with blanks and out-of-range values. The backend reads a
 * tax rate of 0 as "not given" and substitutes 11% on create (and keeps the old rate
 * on update), so accepting 0 here would quietly save something else.
 */
export function vatPercentToRate(input: unknown): number | null {
  if (input === null || input === undefined || (typeof input === 'string' && input.trim() === ''))
    return null

  const percent = typeof input === 'number' ? input : Number(input)
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100)
    return null

  return Math.round(percent * 100) / 10000
}

/** For labels: 0.11 → "11", 0.125 → "12.5". No trailing zeros. */
export function formatVatPercent(rate: number): string {
  return String(vatRateToPercent(rate))
}
