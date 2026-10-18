import { describe, expect, it } from 'vitest'
import { hasBrandContact, mergeBrandContact } from '@/utils/brandContact'

const brand = {
  attention_to: 'Budi Santoso',
  job_title: 'Marketing Director',
  contact_phone: '+62 812 3456 7890',
  contact_email: 'budi@example.com',
}

const blank = { attention_to: '', job_title: '', contact_phone: '', contact_email: '' }

describe('mergeBrandContact', () => {
  it('fills an empty form from the brand', () => {
    expect(mergeBrandContact(blank, brand)).toEqual(brand)
  })

  // The seller addressed this one quotation to someone else; switching brand back
  // and forth must not silently undo that.
  it('never overwrites what the seller already typed', () => {
    const typed = { ...blank, attention_to: 'Siti Rahayu' }

    const merged = mergeBrandContact(typed, brand)

    expect(merged.attention_to).toBe('Siti Rahayu')
    expect(merged.job_title).toBe('Marketing Director')
  })

  it('treats whitespace as empty', () => {
    expect(mergeBrandContact({ ...blank, attention_to: '   ' }, brand).attention_to)
      .toBe('Budi Santoso')
  })

  // "Reset to brand contact" is the one action that is allowed to overwrite.
  it('overwrites everything when forced', () => {
    const typed = { ...brand, attention_to: 'Siti Rahayu', job_title: 'CFO' }

    expect(mergeBrandContact(typed, brand, true)).toEqual(brand)
  })

  it('leaves the form alone when no brand is selected', () => {
    const typed = { ...blank, attention_to: 'Siti Rahayu' }

    expect(mergeBrandContact(typed, null)).toEqual(typed)
  })

  it('fills only what the brand actually carries', () => {
    const partial = { attention_to: 'Budi Santoso', job_title: '', contact_phone: '', contact_email: '' }

    expect(mergeBrandContact(blank, partial)).toEqual(partial)
  })

  it('returns a new object rather than mutating the form', () => {
    const typed = { ...blank }

    mergeBrandContact(typed, brand)

    expect(typed).toEqual(blank)
  })
})

describe('hasBrandContact', () => {
  it('is true once a brand names someone', () => {
    expect(hasBrandContact(brand)).toBe(true)
  })

  it('is false for a brand saved before contacts were required', () => {
    expect(hasBrandContact(blank)).toBe(false)
    expect(hasBrandContact({ attention_to: '  ' })).toBe(false)
    expect(hasBrandContact(null)).toBe(false)
  })
})
