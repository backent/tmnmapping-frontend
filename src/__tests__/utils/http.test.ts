import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteApi, getApi, postApi, postFormApi, putApi } from '@/utils/http'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  }
}

const mockFetch = vi.fn()

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch)
})

afterEach(() => {
  mockFetch.mockReset()
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// getApi
// ---------------------------------------------------------------------------

describe('getApi', () => {
  it('calls fetch with the GET method', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ data: 'ok' }))
    await getApi('/test')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/test'),
      expect.objectContaining({ method: 'GET' }),
    )
  })

  it('includes credentials: include for cookie-based auth', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await getApi('/test')
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('appends query params to the URL', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await getApi('/test', { page: 2, limit: 5 })

    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('page=2')
    expect(calledUrl).toContain('limit=5')
  })

  it('skips null and undefined query params', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await getApi('/test', { page: 1, search: null, filter: undefined })

    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('page=1')
    expect(calledUrl).not.toContain('search')
    expect(calledUrl).not.toContain('filter')
  })

  it('replaces URL placeholders using the body argument', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await getApi('/buildings/:id', {}, { id: 42 })

    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('/buildings/42')
    expect(calledUrl).not.toContain(':id')
  })

  it('returns the parsed JSON response', async () => {
    const responseBody = { data: { id: 1, name: 'Test' } }
    mockFetch.mockResolvedValue(createMockResponse(responseBody))
    const result = await getApi('/test')
    expect(result).toEqual(responseBody)
  })

  it('throws an error with the HTTP status on a 404 response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ message: 'Not Found' }, 404))
    await expect(getApi('/test')).rejects.toThrow('HTTP error! Status: 404')
  })

  it('throws an error on a 500 response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ message: 'Server Error' }, 500))
    await expect(getApi('/test')).rejects.toThrow('HTTP error! Status: 500')
  })

  it('redirects to /login on a 401 response', async () => {
    const response401 = createMockResponse({ message: 'Unauthorized' }, 401)
    mockFetch.mockResolvedValue(response401)

    // jsdom doesn't navigate, but we can verify window.location.href was set
    const originalLocation = window.location
    const mockAssign = vi.fn()
    Object.defineProperty(window, 'location', {
      value: { href: '', assign: mockAssign },
      writable: true,
    })

    await expect(getApi('/secure')).rejects.toThrow()

    expect(window.location.href).toBe('/login')

    Object.defineProperty(window, 'location', { value: originalLocation, writable: true })
  })

  it('attaches Accept and Content-Type headers', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await getApi('/test')

    const requestOptions = mockFetch.mock.calls[0][1]
    expect(requestOptions.headers).toMatchObject({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    })
  })
})

// ---------------------------------------------------------------------------
// postApi
// ---------------------------------------------------------------------------

describe('postApi', () => {
  it('calls fetch with the POST method', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ data: 'created' }))
    await postApi('/test', {})
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('serialises the body as JSON', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ data: 'created' }))
    const body = { name: 'Alice', age: 30 }
    await postApi('/test', body)

    const requestOptions = mockFetch.mock.calls[0][1]
    expect(requestOptions.body).toBe(JSON.stringify(body))
  })

  it('includes credentials', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await postApi('/test', {})
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('appends query params to the URL', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await postApi('/test', {}, { page: 3 })

    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('page=3')
  })

  it('returns the parsed JSON response', async () => {
    const body = { data: { id: 99 } }
    mockFetch.mockResolvedValue(createMockResponse(body))
    const result = await postApi('/test')
    expect(result).toEqual(body)
  })

  it('throws on a non-OK response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ error: 'Bad Request' }, 400))
    await expect(postApi('/test')).rejects.toThrow('HTTP error! Status: 400')
  })
})

// ---------------------------------------------------------------------------
// putApi
// ---------------------------------------------------------------------------

describe('putApi', () => {
  it('calls fetch with the PUT method', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ data: 'updated' }))
    await putApi('/test', {})
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'PUT' }),
    )
  })

  it('serialises the body as JSON', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    const body = { name: 'Bob' }
    await putApi('/test', body)

    const requestOptions = mockFetch.mock.calls[0][1]
    expect(requestOptions.body).toBe(JSON.stringify(body))
  })

  it('replaces URL placeholders using body fields', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await putApi('/buildings/:id', { id: 7, name: 'Tower A' })

    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('/buildings/7')
  })

  it('throws on a non-OK response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}, 422))
    await expect(putApi('/test', {})).rejects.toThrow('HTTP error! Status: 422')
  })
})

// ---------------------------------------------------------------------------
// deleteApi
// ---------------------------------------------------------------------------

describe('deleteApi', () => {
  it('calls fetch with the DELETE method', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ data: 'deleted' }))
    await deleteApi('/test', {})
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('replaces URL placeholders using body fields', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await deleteApi('/items/:id', { id: 5 })

    const calledUrl: string = mockFetch.mock.calls[0][0]
    expect(calledUrl).toContain('/items/5')
    expect(calledUrl).not.toContain(':id')
  })

  it('includes credentials', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await deleteApi('/test', {})
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('throws on a non-OK response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}, 403))
    await expect(deleteApi('/test', {})).rejects.toThrow('HTTP error! Status: 403')
  })
})

// ---------------------------------------------------------------------------
// postFormApi
// ---------------------------------------------------------------------------

describe('postFormApi', () => {
  it('calls fetch with the POST method and a FormData body', async () => {
    mockFetch.mockResolvedValue(createMockResponse({ data: 'uploaded' }))
    const formData = new FormData()
    formData.append('file', new Blob(['test']), 'test.txt')

    await postFormApi('/upload', formData)

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ method: 'POST', body: formData }),
    )
  })

  it('does NOT set a Content-Type header (lets browser set boundary)', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    const formData = new FormData()

    await postFormApi('/upload', formData)

    const requestOptions = mockFetch.mock.calls[0][1]
    // headers should be undefined or not contain Content-Type
    expect(requestOptions.headers).toBeUndefined()
  })

  it('includes credentials', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}))
    await postFormApi('/upload', new FormData())
    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ credentials: 'include' }),
    )
  })

  it('throws on a non-OK response', async () => {
    mockFetch.mockResolvedValue(createMockResponse({}, 413))
    await expect(postFormApi('/upload', new FormData())).rejects.toThrow('HTTP error! Status: 413')
  })
})
