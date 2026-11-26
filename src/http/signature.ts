/**
 * Approval signatures (2026-11-12).
 *
 * An approver uploads their own signature (`/me/signature`); an admin can upload,
 * view or remove anyone's (`/users/:id/signature`). An approved quotation prints the
 * signature it was approved with (`/quotations/:id/approval-signature`), which never
 * changes afterwards.
 *
 * The images are served only behind login, so they are loaded with the session
 * cookie like any other API call: a plain <img src> works.
 */

import { deleteApi, postFormApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse } from '@/types/api'
import type { SignatureInfo } from '@/types/user'

/** What the upload accepts. The server also re-checks the file itself. */
export const SIGNATURE_ACCEPT = 'image/png,image/jpeg'

/** The server refuses more than this. */
export const SIGNATURE_MAX_BYTES = 2 * 1024 * 1024

function form(file: File): FormData {
  const data = new FormData()

  data.append('file', file)

  return data
}

const userPath = (id: number) => apiConfig.endpoints.user_signature.replace(':id', String(id))

export function uploadMySignature(file: File): Promise<ApiResponse<SignatureInfo>> {
  return postFormApi<ApiResponse<SignatureInfo>>(apiConfig.endpoints.my_signature, form(file))
}

export function deleteMySignature(): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(apiConfig.endpoints.my_signature)
}

export function uploadUserSignature(id: number, file: File): Promise<ApiResponse<SignatureInfo>> {
  return postFormApi<ApiResponse<SignatureInfo>>(userPath(id), form(file))
}

export function deleteUserSignature(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(userPath(id))
}

/**
 * Image URLs. The current signature changes on every upload, so callers pass a
 * version to bust the browser cache; an approval's never changes.
 */
export function mySignatureUrl(version: string | number): string {
  return `${apiConfig.baseUrl}${apiConfig.endpoints.my_signature}?v=${encodeURIComponent(String(version))}`
}

export function userSignatureUrl(id: number, version: string | number): string {
  return `${apiConfig.baseUrl}${userPath(id)}?v=${encodeURIComponent(String(version))}`
}

export function approvalSignatureUrl(quotationId: number): string {
  return `${apiConfig.baseUrl}${apiConfig.endpoints.quotation_approval_signature.replace(':id', String(quotationId))}`
}

/** A reason the file cannot be uploaded, checked before sending; null when fine. */
export function signatureFileProblem(file: File): string | null {
  if (!['image/png', 'image/jpeg'].includes(file.type))
    return 'Use a PNG or JPEG image.'
  if (file.size > SIGNATURE_MAX_BYTES)
    return 'The image must be 2 MB or smaller.'

  return null
}
