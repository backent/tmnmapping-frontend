import { deleteApi, getApi, postApi, putApi } from '@/utils/http'
import { apiConfig } from '@/config/api'
import type { ApiResponse, PaginationParams } from '@/types/api'
import type { CreateUserRequest, ManagedUser, QuotationOwner, UpdateUserRequest } from '@/types/user'

export function getUsers(params?: PaginationParams): Promise<ApiResponse<ManagedUser[]>> {
  return getApi<ApiResponse<ManagedUser[]>>(
    apiConfig.endpoints.users_list,
    params || {},
  )
}

export function getUserById(id: number): Promise<ApiResponse<ManagedUser>> {
  return getApi<ApiResponse<ManagedUser>>(
    apiConfig.endpoints.users_get,
    {},
    { id },
  )
}

export function createUser(data: CreateUserRequest): Promise<ApiResponse<ManagedUser>> {
  return postApi<ApiResponse<ManagedUser>>(
    apiConfig.endpoints.users_create,
    data,
  )
}

export function updateUser(id: number, data: UpdateUserRequest): Promise<ApiResponse<ManagedUser>> {
  return putApi<ApiResponse<ManagedUser>>(
    apiConfig.endpoints.users_update,
    data,
    { id },
  )
}

export function deleteUser(id: number): Promise<ApiResponse<string>> {
  return deleteApi<ApiResponse<string>>(
    apiConfig.endpoints.users_delete,
    {},
    { id },
  )
}

/**
 * Who may own a quotation or hold a brand as PIC: names only. Open to admin and sales
 * admin (`quotations.admin`), so sales admin can fill the pickers without reading
 * user accounts.
 */
export function getQuotationOwners(): Promise<ApiResponse<QuotationOwner[]>> {
  return getApi<ApiResponse<QuotationOwner[]>>(apiConfig.endpoints.quotation_owners)
}
