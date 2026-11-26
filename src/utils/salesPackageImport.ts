/**
 * Sales package import problems (2026-11-12).
 *
 * The import is all-or-nothing. When it refuses a file, the API lists every
 * problem in the error's `extras` at once:
 * - `row_errors`: rows it could not match to a building (by IRIS code, or by
 *   building name when the row has no IRIS code);
 * - `duplicates`: buildings listed more than once for the same package.
 */

import { extractApiError } from '@/utils/apiError'

export interface ImportRowError {
  row: number
  name: string
  value: string
  message: string
}

export interface ImportDuplicate {
  name: string
  building_name: string
  iris_code?: string
  rows: number[]
}

export interface ImportProblems {
  message: string
  rowErrors: ImportRowError[]
  duplicates: ImportDuplicate[]
}

/** The columns the import reads, for the help text. Export writes the same ones. */
export const SALES_PACKAGE_IMPORT_COLUMNS = ['Name', 'IRIS Code', 'Building Name'] as const

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

/**
 * The row-level problems of a refused import, or null when the error is not one
 * (a bad file type, a missing column, a server error) and a plain message will do.
 */
export function importProblems(error: unknown): ImportProblems | null {
  const extras = (error as { details?: { extras?: Record<string, unknown> } } | null)?.details?.extras
  const rowErrors = asArray<ImportRowError>(extras?.row_errors)
  const duplicates = asArray<ImportDuplicate>(extras?.duplicates)

  if (rowErrors.length === 0 && duplicates.length === 0)
    return null

  return {
    message: extractApiError(error, 'Import failed'),
    rowErrors,
    duplicates,
  }
}
