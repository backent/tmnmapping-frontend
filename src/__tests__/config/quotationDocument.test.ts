import { describe, expect, it } from 'vitest'
import {
  INVOICING_DOCUMENTS,
  PAYMENT_TERMS,
  TERMS_AND_CONDITIONS,
  TERMS_VERSION,
  launchDeadlineNote,
} from '@/config/quotationDocument'

describe('quotation document content', () => {
  // The terms carry legal force, so a wording change must be a deliberate,
  // versioned act. This fingerprint fails the moment the text moves: when it
  // does, re-read the change, then bump TERMS_VERSION and update both numbers.
  it('pins the terms to their version', () => {
    const fingerprint = TERMS_AND_CONDITIONS.join('\n').length

    expect(TERMS_VERSION).toBe('2026.1')
    expect(TERMS_AND_CONDITIONS).toHaveLength(10)
    expect(fingerprint).toBe(1264)
  })

  it('keeps every clause non-empty', () => {
    for (const clause of [...TERMS_AND_CONDITIONS, ...PAYMENT_TERMS, ...INVOICING_DOCUMENTS])
      expect(clause.trim()).not.toBe('')
  })

  it('names the campaign year in the launch deadline', () => {
    expect(launchDeadlineNote(2026)).toContain('30 Dec 2026')
  })

  // campaign_year is optional on a draft, and a deadline reading "30 Dec 0" is
  // worse than one a year off.
  it('falls back to the current year when the campaign year is unset', () => {
    expect(launchDeadlineNote(0)).toContain(`30 Dec ${new Date().getFullYear()}`)
  })
})
