/**
 * Carrying a brand's contact into a quotation.
 *
 * The brand holds the master contact so nobody retypes the same person for every
 * campaign. The quotation still keeps its OWN copy: what the document prints is what
 * was agreed at the time, not whatever the brand says today — the same reason
 * building names and prices are snapshotted rather than joined.
 */

export const BRAND_CONTACT_FIELDS = [
  'attention_to',
  'job_title',
  'contact_phone',
  'contact_email',
] as const

export type BrandContactField = typeof BRAND_CONTACT_FIELDS[number]

export type BrandContact = Record<BrandContactField, string>

/**
 * Merge a brand's contact into what the form currently holds.
 *
 * Only blank fields are filled. A seller who has typed a different contact — or is
 * editing a quotation that was addressed to someone else — must not have it
 * overwritten by changing brand and changing back. `force` is the explicit
 * "reset to brand contact" action, which is the one case that does overwrite.
 */
export function mergeBrandContact(
  current: Partial<BrandContact>,
  brand: Partial<BrandContact> | null,
  force = false,
): BrandContact {
  const merged = {
    attention_to: current.attention_to ?? '',
    job_title: current.job_title ?? '',
    contact_phone: current.contact_phone ?? '',
    contact_email: current.contact_email ?? '',
  }

  if (!brand)
    return merged

  for (const field of BRAND_CONTACT_FIELDS) {
    if (force || !merged[field].trim())
      merged[field] = brand[field] ?? ''
  }

  return merged
}

/** A brand with no contact saved cannot prefill anything, and the wizard says so. */
export function hasBrandContact(brand: Partial<BrandContact> | null): boolean {
  return !!brand?.attention_to?.trim()
}
