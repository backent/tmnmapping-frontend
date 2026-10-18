import { describe, expect, it } from 'vitest'
import { useTableSort } from '@/composables/useTableSort'

describe('useTableSort', () => {
  it('starts on the column and direction the page asked for', () => {
    const { orderBy, orderDirection } = useTableSort('created_at', 'DESC')

    expect(orderBy.value).toBe('created_at')
    expect(orderDirection.value).toBe('DESC')
  })

  // A first click meaning "show me A first" is why this is not DESC: landing on
  // Z-to-A after clicking a name column reads as broken.
  it('starts a newly chosen column ascending', () => {
    const { orderBy, orderDirection, toggle } = useTableSort('created_at', 'DESC')

    toggle('name')

    expect(orderBy.value).toBe('name')
    expect(orderDirection.value).toBe('ASC')
  })

  it('flips direction when the active column is clicked again', () => {
    const { orderDirection, toggle } = useTableSort('created_at', 'DESC')

    toggle('name')
    expect(orderDirection.value).toBe('ASC')

    toggle('name')
    expect(orderDirection.value).toBe('DESC')

    toggle('name')
    expect(orderDirection.value).toBe('ASC')
  })

  // Switching away and back should not resume the old direction -- the user is
  // asking a new question about that column.
  it('restarts ascending when returning to a previously sorted column', () => {
    const { orderBy, orderDirection, toggle } = useTableSort('created_at', 'DESC')

    toggle('name')
    toggle('name')
    expect(orderDirection.value).toBe('DESC')

    toggle('code')
    toggle('name')

    expect(orderBy.value).toBe('name')
    expect(orderDirection.value).toBe('ASC')
  })

  it('flips the default column on its first click rather than resetting it', () => {
    const { orderBy, orderDirection, toggle } = useTableSort('created_at', 'DESC')

    toggle('created_at')

    expect(orderBy.value).toBe('created_at')
    expect(orderDirection.value).toBe('ASC')
  })

  // Each list owns its own state; two tables on one screen must not share it.
  it('keeps separate instances independent', () => {
    const first = useTableSort('created_at', 'DESC')
    const second = useTableSort('name', 'ASC')

    first.toggle('status')

    expect(first.orderBy.value).toBe('status')
    expect(second.orderBy.value).toBe('name')
    expect(second.orderDirection.value).toBe('ASC')
  })
})
