import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useUserStore } from '@/stores/user'
import type { ManagedUser } from '@/types/user'

import { createUser, deleteUser, getUserById, getUsers, updateUser } from '@/http/user'

vi.mock('@/http/user', () => ({
  getUsers: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}))

const salesUser: ManagedUser = {
  id: 1,
  username: 'sales1',
  name: 'Sales One',
  email: 'sales1@test.com',
  role: 'sales',
  can_create_quotations: true,
  sales_group: 'sales_team',
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

const adminUser: ManagedUser = {
  ...salesUser,
  id: 2,
  username: 'admin1',
  name: 'Admin One',
  role: 'admin',
  can_create_quotations: false,
  sales_group: '',
}

describe('useUserStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('fetchList', () => {
    it('stores items and derives pagination from extras', async () => {
      vi.mocked(getUsers).mockResolvedValue({
        data: [salesUser, adminUser],
        extras: { take: 10, skip: 20, total: 42 },
      } as any)

      const store = useUserStore()

      await store.fetchList({ take: 10, skip: 20 })

      expect(store.items).toHaveLength(2)
      expect(store.pagination).toEqual({
        currentPage: 3,
        lastPage: 5,
        perPage: 10,
        total: 42,
      })
    })

    it('falls back to the payload length when extras are absent', async () => {
      vi.mocked(getUsers).mockResolvedValue({ data: [salesUser] } as any)

      const store = useUserStore()

      await store.fetchList()

      expect(store.pagination.total).toBe(1)
      expect(store.pagination.currentPage).toBe(1)
    })

    it('clears the loading flag when the request fails', async () => {
      vi.mocked(getUsers).mockRejectedValue(new Error('boom'))

      const store = useUserStore()

      await expect(store.fetchList()).rejects.toThrow('boom')
      expect(store.isLoading).toBe(false)
    })
  })

  describe('create', () => {
    it('appends the created user', async () => {
      vi.mocked(createUser).mockResolvedValue({ data: adminUser } as any)

      const store = useUserStore()

      await store.create({
        username: 'admin1',
        name: 'Admin One',
        email: 'admin1@test.com',
        password: 'secret123',
        role: 'admin',
        can_create_quotations: false,
        sales_group: '',
      })

      expect(store.items).toEqual([adminUser])
    })
  })

  describe('update', () => {
    it('replaces the item in the list and refreshes currentItem', async () => {
      const renamed = { ...salesUser, name: 'Renamed' }

      vi.mocked(updateUser).mockResolvedValue({ data: renamed } as any)

      const store = useUserStore()

      store.items = [salesUser, adminUser]
      store.currentItem = salesUser

      await store.update(1, {
        username: 'sales1',
        name: 'Renamed',
        email: 'sales1@test.com',
        role: 'sales',
        can_create_quotations: true,
        sales_group: 'sales_team',
      })

      expect(store.items[0].name).toBe('Renamed')
      expect(store.currentItem?.name).toBe('Renamed')
    })

    it('leaves an untouched currentItem alone', async () => {
      vi.mocked(updateUser).mockResolvedValue({ data: { ...adminUser, name: 'Other' } } as any)

      const store = useUserStore()

      store.items = [salesUser, adminUser]
      store.currentItem = salesUser

      await store.update(2, {
        username: 'admin1',
        name: 'Other',
        email: '',
        role: 'admin',
        can_create_quotations: false,
        sales_group: '',
      })

      expect(store.currentItem).toEqual(salesUser)
    })
  })

  describe('deleteItem', () => {
    it('removes the user from the list', async () => {
      vi.mocked(deleteUser).mockResolvedValue({ data: 'ok' } as any)

      const store = useUserStore()

      store.items = [salesUser, adminUser]

      await store.deleteItem(1)

      expect(store.items).toEqual([adminUser])
    })

    it('clears currentItem when it was the deleted user', async () => {
      vi.mocked(deleteUser).mockResolvedValue({ data: 'ok' } as any)

      const store = useUserStore()

      store.items = [salesUser]
      store.currentItem = salesUser

      await store.deleteItem(1)

      expect(store.currentItem).toBeNull()
    })

    it('keeps the list intact when the request fails', async () => {
      vi.mocked(deleteUser).mockRejectedValue(new Error('last admin'))

      const store = useUserStore()

      store.items = [salesUser, adminUser]

      await expect(store.deleteItem(2)).rejects.toThrow('last admin')
      expect(store.items).toHaveLength(2)
    })
  })

  describe('fetchById', () => {
    it('stores the fetched user', async () => {
      vi.mocked(getUserById).mockResolvedValue({ data: adminUser } as any)

      const store = useUserStore()

      await store.fetchById(2)

      expect(store.currentItem).toEqual(adminUser)
    })
  })

  describe('clearCurrentItem', () => {
    it('resets currentItem', () => {
      const store = useUserStore()

      store.currentItem = salesUser
      store.clearCurrentItem()

      expect(store.currentItem).toBeNull()
    })
  })
})
