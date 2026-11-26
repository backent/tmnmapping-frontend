import { defineStore } from 'pinia'
import { createUser, deleteUser, getUserById, getUsers, updateUser } from '@/http/user'
import type { CreateUserRequest, ManagedUser, UpdateUserRequest } from '@/types/user'
import type { PaginationParams } from '@/types/api'

interface UserState {
  items: ManagedUser[]
  currentItem: ManagedUser | null
  isLoading: boolean
  pagination: {
    currentPage: number
    lastPage: number
    perPage: number
    total: number
  }
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    items: [],
    currentItem: null,
    isLoading: false,
    pagination: {
      currentPage: 1,
      lastPage: 1,
      perPage: 10,
      total: 0,
    },
  }),

  actions: {
    async fetchList(params?: PaginationParams) {
      this.isLoading = true
      try {
        const response = await getUsers(params)

        this.items = response.data || []
        if (response.extras) {
          const take = response.extras.take || 10
          const skip = response.extras.skip || 0
          const total = response.extras.total || 0

          this.pagination = {
            currentPage: Math.floor(skip / take) + 1,
            lastPage: Math.ceil(total / take) || 1,
            perPage: take,
            total,
          }
        }
        else {
          this.pagination.total = response.data?.length || 0
          this.pagination.currentPage = 1
          this.pagination.perPage = params?.take || 10
          this.pagination.lastPage = Math.ceil(this.pagination.total / this.pagination.perPage) || 1
        }

        return response
      }
      catch (error) {
        console.error('Error fetching users:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async fetchById(id: number) {
      this.isLoading = true
      try {
        const response = await getUserById(id)

        this.currentItem = response.data || null

        return response
      }
      catch (error) {
        console.error('Error fetching user:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async create(data: CreateUserRequest) {
      this.isLoading = true
      try {
        const response = await createUser(data)
        if (response.data)
          this.items.push(response.data)

        return response
      }
      catch (error) {
        console.error('Error creating user:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async update(id: number, data: UpdateUserRequest) {
      this.isLoading = true
      try {
        const response = await updateUser(id, data)
        if (response.data) {
          const index = this.items.findIndex(item => item.id === id)
          if (index !== -1)
            this.items[index] = response.data

          if (this.currentItem?.id === id)
            this.currentItem = response.data
        }

        return response
      }
      catch (error) {
        console.error('Error updating user:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    async deleteItem(id: number) {
      this.isLoading = true
      try {
        await deleteUser(id)
        this.items = this.items.filter(item => item.id !== id)
        if (this.currentItem?.id === id)
          this.currentItem = null
      }
      catch (error) {
        console.error('Error deleting user:', error)
        throw error
      }
      finally {
        this.isLoading = false
      }
    },

    clearCurrentItem() {
      this.currentItem = null
    },
  },
})
