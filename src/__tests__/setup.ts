/**
 * Global test setup
 * Runs before each test file
 */
import { vi } from 'vitest'

// Ensure import.meta.env is available for config/api.ts
// vitest handles import.meta.env automatically, but we can override specific vars here
Object.defineProperty(import.meta, 'env', {
  value: {
    ...import.meta.env,
    VITE_API_BASE_URL: '/api',
  },
  writable: true,
})

// Suppress console.error in tests unless needed
vi.spyOn(console, 'error').mockImplementation(() => {})
