import type { Role, SalesGroup } from '@/config/roles'

export interface ManagedUser {
  id: number
  username: string
  name: string
  email: string
  role: Role
  can_create_quotations: boolean
  sales_group: SalesGroup | ''

  /** Printed under the approver's name on an approved quotation (2026-11-12). */
  job_title: string
  has_signature: boolean
  created_at: string
  updated_at: string
}

export interface CreateUserRequest {
  username: string
  name: string
  email: string
  password: string
  role: Role
  can_create_quotations: boolean
  sales_group: SalesGroup | ''
  job_title: string
}

/** `password` is optional on update: omitting it leaves the existing one alone. */
export interface UpdateUserRequest {
  username: string
  name: string
  email: string
  password?: string
  role: Role
  can_create_quotations: boolean
  sales_group: SalesGroup | ''
  job_title: string
}

/** A possible quotation owner or sales PIC, as `GET /quotation-owners` lists it. */
export interface QuotationOwner {
  id: number
  username: string
  name: string
  role: string
}

/** A user's current signature, without the image (served on its own URL). */
export interface SignatureInfo {
  user_id: number
  has_signature: boolean
  width: number
  height: number
}
