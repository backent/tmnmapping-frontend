import type { Role, SalesGroup } from '@/config/roles'

export interface ManagedUser {
  id: number
  username: string
  name: string
  email: string
  role: Role
  can_create_quotations: boolean
  sales_group: SalesGroup | ''
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
}
