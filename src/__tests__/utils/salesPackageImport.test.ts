import { describe, expect, it } from 'vitest'
import { SALES_PACKAGE_IMPORT_COLUMNS, importProblems } from '@/utils/salesPackageImport'

// The error shape utils/http.ts throws: the backend envelope hangs off `details`.
function apiError(data: string, extras?: Record<string, unknown>) {
  return { status: 400, details: { status: 400, code: 'BAD_REQUEST', data, extras } }
}

describe('importProblems (2026-11-12)', () => {
  it('lists unmatched rows and duplicates from the error extras', () => {
    const problems = importProblems(apiError('2 row(s) could not be matched to a building.', {
      row_errors: [
        { row: 3, name: 'Package X', value: 'XX9999', message: 'IRIS code not found' },
        { row: 4, name: 'Package Y', value: 'Nowhere Tower', message: 'Building not found' },
      ],
      duplicates: [{ name: 'Package X', building_name: 'Tower A', iris_code: 'TB0432', rows: [2, 5] }],
    }))

    expect(problems).not.toBeNull()
    expect(problems!.message).toBe('2 row(s) could not be matched to a building.')
    expect(problems!.rowErrors.map(r => r.row)).toEqual([3, 4])
    expect(problems!.duplicates[0].iris_code).toBe('TB0432')
  })

  it('handles a file with duplicates only', () => {
    const problems = importProblems(apiError('Duplicate rows found', {
      row_errors: [],
      duplicates: [{ name: 'Package X', building_name: 'Tower A', rows: [2, 3] }],
    }))

    expect(problems!.rowErrors).toEqual([])
    expect(problems!.duplicates).toHaveLength(1)
  })

  it('still reads the older duplicates-only response', () => {
    const problems = importProblems(apiError('Duplicate rows found', {
      duplicates: [{ name: 'Package X', building_name: 'Tower A', rows: [2, 3] }],
    }))

    expect(problems!.rowErrors).toEqual([])
    expect(problems!.duplicates).toHaveLength(1)
  })

  it('returns null for errors without row problems, so a plain message is shown', () => {
    expect(importProblems(apiError('Missing required column: iris_code or building_name'))).toBeNull()
    expect(importProblems(apiError('Bad', { row_errors: 'nonsense' }))).toBeNull()
    expect(importProblems(new Error('Network down'))).toBeNull()
    expect(importProblems(null)).toBeNull()
  })

  it('names the columns the export writes', () => {
    expect(SALES_PACKAGE_IMPORT_COLUMNS).toEqual(['Name', 'IRIS Code', 'Building Name'])
  })
})
