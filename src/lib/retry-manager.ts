/**
 * RetryManager - Encapsulates retry semantics for different failure types.
 * Exposes methods: retryPage(), retryRequest(requestFn), retryWithBackoff().
 */

export type RetryStrategy = 'page' | 'request' | 'backoff'

export interface RetryOptions {
  maxAttempts?: number
  baseDelayMs?: number
  maxDelayMs?: number
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
}

/**
 * Full page reload. Use when route-level refetch is not possible.
 */
export function retryPage(): void {
  if (typeof window !== 'undefined') {
    window.location.reload()
  }
}

/**
 * Retry a specific async request function.
 * Returns the result of the request or throws on final failure.
 */
export async function retryRequest<T>(
  requestFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: unknown
  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await requestFn()
    } catch (err) {
      lastError = err
      if (attempt === opts.maxAttempts) break
      const delay = Math.min(
        opts.baseDelayMs * Math.pow(2, attempt - 1),
        opts.maxDelayMs
      )
      await new Promise((r) => setTimeout(r, delay))
    }
  }
  throw lastError
}

/**
 * Retry with exponential backoff.
 * Returns a promise that resolves after the backoff delay.
 */
export async function retryWithBackoff(
  attempt: number,
  options: RetryOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  const delay = Math.min(
    opts.baseDelayMs * Math.pow(2, attempt),
    opts.maxDelayMs
  )
  await new Promise((r) => setTimeout(r, delay))
}

export const RetryManager = {
  retryPage,
  retryRequest,
  retryWithBackoff,
}
