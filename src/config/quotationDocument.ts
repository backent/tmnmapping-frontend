/**
 * Static content for the printed quotation, transcribed from the 2026 template
 * (260101. Template Quotation 2026.pdf).
 *
 * These are commercial terms with legal force -- clause 1 says so. They are kept
 * here rather than inline in the template so they can be reviewed as text, and
 * versioned: a quotation signed under 2026 terms must keep those terms even after
 * the wording changes. TERMS_VERSION is what a future quotation would store.
 *
 * Transcribed verbatim, including the source's own typos ("maximun",
 * "Cancelation", "foreit"). Correcting a binding document silently is not ours to
 * do -- see the note in QUOTATION_DOCUMENT_ANALYSIS.md §6.2.
 */

export const TERMS_VERSION = '2026.1'

export const COMPANY = {
  name: 'TARGET MEDIA NUSANTARA',
  addressLines: [
    'RDTX SQUARE, 19/Fl.',
    'Jl. Prof. Dr. Satrio No. 164 Jakarta 12930',
  ],
  phone: '+62 21 25532618',
  email: 'hello@targetmedia.id',
}

export const TERMS_AND_CONDITIONS: string[] = [
  'This quotation is having legal force and binding effect on client and TMN',
  'Advertising Tax included',
  'Media Plan will be sent after Quotation Signed',
  'Advertiser must send Purchase Order as confirmation 7 working days before campaign start',
  'Advertiser must provide contents in accordance with the requirements set out in TMN - Content Standardization Guideline',
  'Contents for any advertisements must adhere to TMN’s technical specifications and be delivered to TMN on Monday one week before placement date',
  'Building List & Summary Media Performance Attached in Separated Document',
  'Due to external and technical factors, there is a possibility the screens will be error maximun error recorded internally is 5% from total screen',
  'Cancelation Policies : 50% of the total amount stated in Signed Quotation will be charged if cancellation is made before PO. 100% of the total amount stated in Signed Quotation will be charged if cancellation is made after PO',
  'In order to support the implementation of cooperation based on this quotation, each Party is permitted to use the names, logos, promotional materials of all kinds of intellectual property rights of the other Party. Including and limited if there is a promo code and talent project, will be attached in separated document.',
]

export const PAYMENT_TERMS: string[] = [
  '50% Down Payment before campaign start (The invoice need to be pay within 30 days after received the invoice)',
  '50% Final Payment after campaign end',
]

/** Deadline clause. The year follows the quotation's campaign year. */
export function launchDeadlineNote(campaignYear: number): string {
  return `If client unable to launch the ads at latest 30 Dec ${campaignYear || new Date().getFullYear()}, the downpayment will be foreit.`
}

export const INVOICING_DOCUMENTS: string[] = [
  'Signed Quotation',
  'Purchase Order',
  'NPWP',
]
