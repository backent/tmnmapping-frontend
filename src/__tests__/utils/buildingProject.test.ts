import { describe, expect, it } from 'vitest'
import {
  changeFieldLabel,
  contractValue,
  hasFinanceFields,
  importSummary,
  pricePerScreen,
  projectToForm,
} from '@/utils/buildingProject'
import type { BuildingProject } from '@/types/buildingproject'

const project = (overrides: Partial<BuildingProject> = {}): BuildingProject => ({
  id: 1,
  project_id_iris: 'PRJ-0001',
  name: 'Gading Resort Residence',
  building_type: 'Apartment',
  grade: 'Grade A',
  pic: 'Dara',
  tmn_project_status: 'Active',
  no_of_tower: 31,
  no_of_screen: 21,
  created_date: '2026-01-05',
  remark: '',
  contract_type: 'Initial',
  contract_date: '2026-01-18',
  contract_start: '2026-02-01',
  contract_end: '2027-01-31',
  period_month: 12,
  payment_term: 'Monthly',
  exclusivity: 'Non-Exclusive',
  doc_type: 'PKS',
  contract_status: 'Signed',
  cancelled_at: '',
  cancel_last_status: '',
  cancel_reason: '',
  building_count: 4,
  created_at: '2026-01-05T00:00:00Z',
  updated_at: '2026-01-05T00:00:00Z',
  ...overrides,
})

// These must agree with PricePerScreen and ContractValue in Go, integer division
// included: the form shows them while editing and the server returns them after
// saving, and a mismatch in the last rupiah reads as a bug.
describe('derived figures', () => {
  it('divides the annual rental across the screens', () => {
    expect(pricePerScreen(24000000, 21)).toBe(1142857)
  })

  it('floors rather than rounds, as the backend does', () => {
    expect(pricePerScreen(10, 3)).toBe(3)
  })

  it('values a contract over its actual length', () => {
    expect(contractValue(24000000, 12)).toBe(24000000)
    expect(contractValue(24000000, 24)).toBe(48000000)
    expect(contractValue(24000000, 60)).toBe(120000000)
  })

  it('reports nothing rather than zero when a divisor is missing', () => {
    expect(pricePerScreen(24000000, 0)).toBeNull()
    expect(pricePerScreen(0, 21)).toBeNull()
    expect(contractValue(24000000, 0)).toBeNull()
  })
})

// The server omits the finance keys instead of zeroing them. Losing that distinction
// would render a withheld rental as "Rp 0", which reads as a fact rather than a gap.
describe('hasFinanceFields', () => {
  it('is true when the caller was served the money', () => {
    expect(hasFinanceFields(project({ annual_rental: 24000000 }))).toBe(true)
  })

  it('is false when the keys are absent', () => {
    expect(hasFinanceFields(project())).toBe(false)
  })

  it('distinguishes a real zero from a withheld value', () => {
    expect(hasFinanceFields(project({ annual_rental: 0 }))).toBe(true)
  })
})

describe('projectToForm', () => {
  it('carries every field across', () => {
    const form = projectToForm(project({ annual_rental: 24000000, company_name: 'PT A', contract_no: 'C/1' }))

    expect(form.project_id_iris).toBe('PRJ-0001')
    expect(form.no_of_tower).toBe(31)
    expect(form.annual_rental).toBe(24000000)
    expect(form.company_name).toBe('PT A')
    expect(form.contract_no).toBe('C/1')
  })

  // A viewer without the permission posts zeros back. The server ignores them and
  // keeps what it holds -- this test records that the form relies on that.
  it('sends zeros for withheld finance fields', () => {
    const form = projectToForm(project())

    expect(form.annual_rental).toBe(0)
    expect(form.company_name).toBe('')
    expect(form.contract_no).toBe('')
  })
})

// A blank cell empties a value on this import, so "12 changed" alone would hide the
// destructive half of what happened.
describe('importSummary', () => {
  it('names cleared fields', () => {
    expect(importSummary({ rows: 12, created: 2, updated: 10, cleared: 47, imported: true, errors: [] }))
      .toBe('Projects applied: 2 new, 10 changed, 47 fields cleared.')
  })

  it('uses the singular for one field', () => {
    expect(importSummary({ rows: 1, created: 0, updated: 1, cleared: 1, imported: true, errors: [] }))
      .toBe('Projects applied: 0 new, 1 changed, 1 field cleared.')
  })

  it('says nothing about clearing when nothing was cleared', () => {
    expect(importSummary({ rows: 3, created: 3, updated: 0, cleared: 0, imported: true, errors: [] }))
      .toBe('Projects applied: 3 new, 0 changed.')
  })

  it('survives a missing result', () => {
    expect(importSummary(null)).toBe('Projects applied: 0 new, 0 changed.')
  })
})

describe('changeFieldLabel', () => {
  it('reads a column name as a heading', () => {
    expect(changeFieldLabel('annual_rental')).toBe('Annual Rental')
    expect(changeFieldLabel('tmn_project_status')).toBe('Tmn Project Status')
  })

  it('shows a dash for a creation row, which names no field', () => {
    expect(changeFieldLabel('')).toBe('-')
  })
})
