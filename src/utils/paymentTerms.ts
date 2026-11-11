/**
 * Terms Of Payment per quotation (2026-11-11).
 *
 * The down payment depends on the customer, so each quotation stores its own
 * payment terms, one term per line, starting from the template wording. The
 * backend keeps the same default (DefaultPaymentTerms in
 * services/quotation/payment_terms.go) and the same normalisation, so what is
 * typed here is exactly what is stored and printed.
 *
 * The launch-deadline line ("If client unable to launch the ads…") is not part of
 * it: it follows the campaign year, so the document prints it on its own.
 */

import { PAYMENT_TERMS } from '@/config/quotationDocument'

/** The template wording, one term per line: what a new quotation starts with. */
export const DEFAULT_PAYMENT_TERMS = PAYMENT_TERMS.join('\n')

/** The backend refuses more than this. */
export const PAYMENT_TERMS_MAX_LENGTH = 2000

/** Trims each line and drops blank ones; Windows line endings become "\n". */
export function normalizePaymentTerms(text: string | null | undefined): string {
  return (text ?? '')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line !== '')
    .join('\n')
}

/** The lines to print. A quotation with none stored prints the template wording. */
export function paymentTermLines(text: string | null | undefined): string[] {
  const normalized = normalizePaymentTerms(text)

  return normalized ? normalized.split('\n') : [...PAYMENT_TERMS]
}

/** True when the terms differ from the template: worth an approver's attention. */
export function isCustomPaymentTerms(text: string | null | undefined): boolean {
  const normalized = normalizePaymentTerms(text)

  return normalized !== '' && normalized !== DEFAULT_PAYMENT_TERMS
}
