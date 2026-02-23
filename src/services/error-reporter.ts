/**
 * ErrorReporter - Centralized module to format, debounce, and send error events to backend API.
 * Retries with exponential backoff if reporting fails (with local fallback).
 * Returns incident ID from backend or generates a client-side fallback UUID.
 */

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const MAX_STACK_LENGTH = 3000
const REPORT_DEBOUNCE_MS = 500
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

/** Config toggle for enabling/disabling automatic error report submission */
export const ERROR_REPORTING_ENABLED =
  import.meta.env.VITE_ERROR_REPORTING_ENABLED !== 'false'

export interface ErrorReportPayload {
  timestamp: string
  userId?: string | null
  route: string
  method?: string
  url?: string
  requestId?: string
  errorMessage: string
  stackTraceSummary?: string
  clientContext?: {
    browser?: string
    os?: string
    appVersion?: string
  }
  tags?: string[]
  dedupToken?: string
}

export interface ErrorReportResponse {
  incidentId: string
  receivedAt: string
}

const pendingReports = new Map<string, ReturnType<typeof setTimeout>>()

function getClientContext(): ErrorReportPayload['clientContext'] {
  if (typeof navigator === 'undefined') return {}
  return {
    browser: navigator.userAgent,
    os: typeof navigator.platform !== 'undefined' ? navigator.platform : undefined,
    appVersion: import.meta.env.VITE_APP_VERSION ?? '1.0.0',
  }
}

function truncateStack(stack: string | undefined): string | undefined {
  if (!stack) return undefined
  return stack.slice(0, MAX_STACK_LENGTH)
}

function generateFallbackId(): string {
  return crypto.randomUUID()
}

async function sendReportWithRetry(
  payload: ErrorReportPayload
): Promise<ErrorReportResponse> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const token = localStorage.getItem('auth_token')
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }

      const response = await fetch(`${API_BASE}/errors/report`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...payload,
          stackTraceSummary: truncateStack(payload.stackTraceSummary),
        }),
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Report failed: ${response.status}`)
      }

      const data = (await response.json()) as ErrorReportResponse
      return data
    } catch {
      if (attempt < MAX_RETRIES - 1) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt)
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  }

  return {
    incidentId: generateFallbackId(),
    receivedAt: new Date().toISOString(),
  }
}

/**
 * Report a server error to the backend. Non-blocking; returns incident ID.
 * If backend is unreachable, returns a client-generated UUID.
 */
export async function reportError(
  payload: Omit<ErrorReportPayload, 'timestamp' | 'clientContext'> &
    Partial<Pick<ErrorReportPayload, 'timestamp' | 'clientContext'>>
): Promise<ErrorReportResponse> {
  const fullPayload: ErrorReportPayload = {
    timestamp: new Date().toISOString(),
    clientContext: getClientContext(),
    ...payload,
  }

  if (!ERROR_REPORTING_ENABLED) {
    return {
      incidentId: generateFallbackId(),
      receivedAt: fullPayload.timestamp,
    }
  }

  return sendReportWithRetry(fullPayload)
}

/**
 * Debounced report for non-critical errors (batched).
 * Critical 500 errors should use reportError directly.
 */
export function reportErrorDebounced(
  payload: Omit<ErrorReportPayload, 'timestamp' | 'clientContext'> &
    Partial<Pick<ErrorReportPayload, 'timestamp' | 'clientContext'>>,
  dedupKey?: string
): void {
  const key = dedupKey ?? `${payload.route}-${payload.errorMessage?.slice(0, 50)}`
  const existing = pendingReports.get(key)
  if (existing) clearTimeout(existing)

  const timer = setTimeout(() => {
    pendingReports.delete(key)
    reportError(payload).catch(() => {
      // Silent - best effort
    })
  }, REPORT_DEBOUNCE_MS)

  pendingReports.set(key, timer)
}

/**
 * Extract incident ID from a 500 error response body if present.
 */
export function extractIncidentIdFromResponse(data: unknown): string | null {
  if (data && typeof data === 'object' && 'incidentId' in data) {
    const id = (data as { incidentId?: unknown }).incidentId
    if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) return id
  }
  if (data && typeof data === 'object' && 'correlationId' in data) {
    const id = (data as { correlationId?: unknown }).correlationId
    if (typeof id === 'string' && /^[0-9a-f-]{36}$/i.test(id)) return id
  }
  return null
}
