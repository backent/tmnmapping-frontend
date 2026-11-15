import { describe, expect, it } from 'vitest'
import { EXECUTIVE_TRACK_NOTE, ownerLabel, ownerTrackNote } from '@/utils/ownerOptions'

// Sales PIC and quotation owner pickers list every user (2026-11-15).

describe('ownerLabel', () => {
  it('names the role, which decides the approval track', () => {
    expect(ownerLabel({ id: 1, name: 'Ayu', username: 'ayu', role: 'head_of_sales' })).toBe('Ayu (ayu) · Head of Sales')
    expect(ownerLabel({ id: 2, name: 'Dimas', username: 'dimas', role: 'sales' })).toBe('Dimas (dimas) · Sales')
  })

  it('shows an unknown role as it is', () => {
    expect(ownerLabel({ id: 3, name: 'X', username: 'x', role: 'partner' })).toBe('X (x) · partner')
  })
})

describe('ownerTrackNote', () => {
  it('warns only for a PIC outside sales', () => {
    expect(ownerTrackNote({ role: 'ceo' })).toBe(EXECUTIVE_TRACK_NOTE)
    expect(ownerTrackNote({ role: 'admin' })).toBe(EXECUTIVE_TRACK_NOTE)
    expect(ownerTrackNote({ role: 'sales' })).toBe('')
    expect(ownerTrackNote({ role: 'sales_admin' })).toBe('')
    expect(ownerTrackNote(undefined)).toBe('')
  })
})
