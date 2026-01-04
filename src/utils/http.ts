/**
 * Core HTTP Utility
 * Provides low-level HTTP request handling with cookie-based authentication
 */

import type { QueryParams } from '@/types/api'
import { apiConfig } from '@/config/api'

const defaultHeaders: Record<string, string> = {
  'Accept': 'application/json',
  'Content-Type': 'application/json',
}

/**
 * Gets default headers for requests
 * Note: Authentication is handled via HTTP-only cookies
 */
function _getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  return {
    ...defaultHeaders,
    ...customHeaders,
  }
}

/**
 * Converts an object to URL query string
 */
function _objectToQueryString(obj: QueryParams, prefix?: string): string {
  const str: string[] = []
  
  for (const p in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, p)) {
      const k = prefix ? `${prefix}[${p}]` : p
      const v = obj[p]
      
      if (v !== undefined && v !== null) {
        str.push(
          (v !== null && typeof v === 'object')
            ? _objectToQueryString(v as QueryParams, k)
            : `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`,
        )
      }
    }
  }
  
  return str.join('&')
}

/**
 * Replaces URL placeholders with actual values
 * Example: /api/users/:id with { id: 123 } becomes /api/users/123
 */
function _replaceUrlPlaceholders(url: string, params: Record<string, any>): string {
  return url.replace(/:([a-zA-Z0-9_]+)/g, (_, key) => {
    return params[key] !== undefined ? String(params[key]) : `:${key}`
  })
}

/**
 * Builds complete URL with query parameters and placeholder replacement
 */
function _buildUrl(
  url: string,
  params: QueryParams = {},
  body: Record<string, any> = {},
): string {
  const fullUrl = apiConfig.baseUrl + _replaceUrlPlaceholders(url, { ...body, ...params })
  const queryString = _objectToQueryString(params)
  
  return queryString ? `${fullUrl}?${queryString}` : fullUrl
}

/**
 * Response interceptor for handling errors and parsing responses
 */
async function _interceptor<T = any>(response: Response): Promise<T> {
  if (!response.ok) {
    // Handle unauthorized access
    if (response.status === 401) {
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
    }
    
    const error = new Error(`HTTP error! Status: ${response.status}`) as any
    error.status = response.status
    error.statusText = response.statusText
    
    // Try to parse error details from response
    try {
      const errorDetails = await response.json()
      error.details = errorDetails
    }
    catch (e) {
      // If JSON parsing fails, try to get text
      try {
        const errorText = await response.text()
        error.details = errorText
      }
      catch {
        error.details = 'Unknown error'
      }
    }
    
    throw error
  }
  
  return response.json()
}

/**
 * Performs a GET request
 */
export async function getApi<T = any>(
  url: string,
  params: QueryParams = {},
  body: Record<string, any> = {},
): Promise<T> {
  const newUrl = _buildUrl(url, params, body)
  
  return fetch(newUrl, {
    method: 'GET',
    headers: _getHeaders(),
    credentials: 'include', // Include cookies for authentication
  }).then(_interceptor)
}

/**
 * Performs a POST request with JSON body
 */
export async function postApi<T = any>(
  url: string,
  body: any = {},
  params: QueryParams = {},
): Promise<T> {
  const newUrl = _buildUrl(url, params)
  
  return fetch(newUrl, {
    method: 'POST',
    headers: _getHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  }).then(_interceptor)
}

/**
 * Performs a POST request with FormData (for file uploads)
 */
export async function postFormApi<T = any>(
  url: string,
  bodyFormData: FormData,
  params: QueryParams = {},
): Promise<T> {
  const newUrl = _buildUrl(url, params)
  
  // Don't set Content-Type header - let browser set it with boundary
  return fetch(newUrl, {
    method: 'POST',
    credentials: 'include',
    body: bodyFormData,
  }).then(_interceptor)
}

/**
 * Performs a PUT request
 */
export async function putApi<T = any>(
  url: string,
  body: any = {},
  params: QueryParams = {},
): Promise<T> {
  const newUrl = _buildUrl(url, params, body)
  
  return fetch(newUrl, {
    method: 'PUT',
    headers: _getHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  }).then(_interceptor)
}

/**
 * Performs a DELETE request
 */
export async function deleteApi<T = any>(
  url: string,
  body: any = {},
  params: QueryParams = {},
): Promise<T> {
  const newUrl = _buildUrl(url, params, body)
  
  return fetch(newUrl, {
    method: 'DELETE',
    headers: _getHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  }).then(_interceptor)
}

/**
 * Performs a POST request with FormData and progress tracking
 * Useful for large file uploads
 */
export function postFormApiWithProgress<T = any>(
  url: string,
  bodyFormData: FormData,
  params: QueryParams = {},
  onProgress: (percent: number) => void = () => {},
): Promise<T> {
  const newUrl = _buildUrl(url, params)
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', newUrl, true)
    
    // Set credentials for cookies
    xhr.withCredentials = true
    
    // Track upload progress
    xhr.upload.onprogress = function (event) {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100
        onProgress(percentComplete)
      }
    }
    
    // Handle successful response
    xhr.onload = function () {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve(response)
        }
        catch (e) {
          reject(new Error('Failed to parse response'))
        }
      }
      else {
        // Handle error response
        const error = new Error(`HTTP error! Status: ${xhr.status}`) as any
        error.status = xhr.status
        error.statusText = xhr.statusText
        
        try {
          error.details = JSON.parse(xhr.responseText)
        }
        catch (e) {
          error.details = xhr.responseText
        }
        
        reject(error)
      }
    }
    
    // Handle network error
    xhr.onerror = function () {
      reject(new Error('Network error'))
    }
    
    // Send the FormData
    xhr.send(bodyFormData)
  })
}

export default {
  getApi,
  postApi,
  putApi,
  postFormApi,
  deleteApi,
  postFormApiWithProgress,
}

