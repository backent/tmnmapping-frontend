import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PAYMENT_TERMS,
  isCustomPaymentTerms,
  normalizePaymentTerms,
  paymentTermLines,
} from '@/utils/paymentTerms'

describe('payment terms', () => {
  it('defaults to the 2026 template wording, two terms', () => {
    expect(DEFAULT_PAYMENT_TERMS.split('\n')).toEqual([
      '50% Down Payment before campaign start (The invoice need to be pay within 30 days after received the invoice)',
      '50% Final Payment after campaign end',
    ])
  })

  it('normalises like the backend: trimmed lines, no blanks, \\n endings', () => {
    expect(normalizePaymentTerms('  30% DP  \r\n\r\n 70% Final \n')).toBe('30% DP\n70% Final')
    expect(normalizePaymentTerms('  \n\t ')).toBe('')
    expect(normalizePaymentTerms(undefined)).toBe('')
  })

  it('prints the stored lines, or the template wording when none are stored', () => {
    expect(paymentTermLines('30% DP\n70% Final')).toEqual(['30% DP', '70% Final'])
    expect(paymentTermLines('')).toEqual(DEFAULT_PAYMENT_TERMS.split('\n'))
    expect(paymentTermLines(null)).toEqual(DEFAULT_PAYMENT_TERMS.split('\n'))
  })

  it('flags terms that differ from the template, ignoring whitespace', () => {
    expect(isCustomPaymentTerms('30% DP\n70% Final')).toBe(true)
    expect(isCustomPaymentTerms(DEFAULT_PAYMENT_TERMS)).toBe(false)
    expect(isCustomPaymentTerms(` ${DEFAULT_PAYMENT_TERMS.replace('\n', '\r\n\r\n')} `)).toBe(false)
    expect(isCustomPaymentTerms('')).toBe(false)
  })
})
