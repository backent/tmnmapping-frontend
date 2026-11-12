import { describe, expect, it } from 'vitest'
import {
  SIGNATURE_MAX_BYTES,
  approvalSignatureUrl,
  mySignatureUrl,
  signatureFileProblem,
  userSignatureUrl,
} from '@/http/signature'

// Approval signatures (2026-11-12).

function file(type: string, size: number): File {
  return new File([new Uint8Array(size)], 'signature', { type })
}

describe('signature URLs', () => {
  it('versions the current signature so a replacement is not served from cache', () => {
    expect(mySignatureUrl(5)).toBe('/api/me/signature?v=5')
    expect(userSignatureUrl(22, 'abc')).toBe('/api/users/22/signature?v=abc')
  })

  it('serves an approval signature by quotation', () => {
    expect(approvalSignatureUrl(9)).toBe('/api/quotations/9/approval-signature')
  })
})

describe('signatureFileProblem', () => {
  it('accepts a PNG or JPEG within the size cap', () => {
    expect(signatureFileProblem(file('image/png', 10))).toBeNull()
    expect(signatureFileProblem(file('image/jpeg', SIGNATURE_MAX_BYTES))).toBeNull()
  })

  it('refuses other types and oversized files before uploading', () => {
    expect(signatureFileProblem(file('image/webp', 10))).toBe('Use a PNG or JPEG image.')
    expect(signatureFileProblem(file('application/pdf', 10))).toBe('Use a PNG or JPEG image.')
    expect(signatureFileProblem(file('image/png', SIGNATURE_MAX_BYTES + 1))).toBe('The image must be 2 MB or smaller.')
  })
})
