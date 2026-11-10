/**
 * Customer and brand choices for the quotation wizard (2026-11-09).
 *
 * A seller may quote only the brands they are the current PIC of, on an active,
 * unexpired assignment, so both dropdowns are built from that seller's usable
 * assignments rather than from every customer and brand. The backend enforces the
 * same rule on create.
 *
 * An existing draft keeps its customer and brand even after the assignment expires
 * (it may still be finished), so the pair it already has is always offered.
 */

import type { SalesAssignment } from '@/types/advertiser'

export interface Option { title: string; value: number }

/** The pair an existing quotation already has, which stays selectable. */
export interface CurrentPair {
  customer_id: number
  customer_name: string
  brand_id: number
  brand_name: string
}

type AssignmentLike = Pick<SalesAssignment,
  'customer_id' | 'customer_name' | 'customer_code' | 'brand_id' | 'brand_name' | 'brand_code'>

const byTitle = (a: Option, b: Option) => a.title.localeCompare(b.title)

export function customerOptionsFrom(assignments: AssignmentLike[], current?: CurrentPair | null): Option[] {
  const seen = new Map<number, Option>()
  for (const a of assignments) {
    if (!seen.has(a.customer_id))
      seen.set(a.customer_id, { title: `${a.customer_name} (${a.customer_code})`, value: a.customer_id })
  }
  if (current?.customer_id && !seen.has(current.customer_id))
    seen.set(current.customer_id, { title: current.customer_name, value: current.customer_id })

  return [...seen.values()].sort(byTitle)
}

export function brandOptionsFrom(
  assignments: AssignmentLike[],
  customerId: number | null,
  current?: CurrentPair | null,
): Option[] {
  if (!customerId)
    return []

  const seen = new Map<number, Option>()
  for (const a of assignments) {
    if (a.customer_id === customerId && !seen.has(a.brand_id))
      seen.set(a.brand_id, { title: `${a.brand_name} (${a.brand_code})`, value: a.brand_id })
  }
  if (current?.brand_id && current.customer_id === customerId && !seen.has(current.brand_id))
    seen.set(current.brand_id, { title: current.brand_name, value: current.brand_id })

  return [...seen.values()].sort(byTitle)
}
