import {
  reportError,
  extractIncidentIdFromResponse,
} from '@/services/error-reporter'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

/** Structured error response from backend: { code, message, details[], correlationId, retryable } */
export interface ApiError {
  message: string
  code?: string
  status?: number
  /** Field-level validation errors for UI mapping */
  details?: Array<{ field?: string; message: string; code?: string }>
  /** Correlation/incident ID for support reference */
  correlationId?: string
  /** Whether the operation can be retried (e.g. transient network/server error) */
  retryable?: boolean
  /** Full response body for rate limit info etc. */
  data?: Record<string, unknown>
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = {
      message: response.statusText,
      status: response.status,
      retryable: response.status >= 500 || response.status === 429,
    }
    try {
      const data = (await response.json()) as Record<string, unknown>
      error.message = (data.message as string) ?? (data.error as string) ?? response.statusText
      error.code = (data.code as string) ?? (data.error as string)
      error.details = Array.isArray(data.details) ? (data.details as ApiError['details']) : undefined
      error.correlationId = (data.correlationId as string) ?? (data.incidentId as string)
      if (typeof data.retryable === 'boolean') error.retryable = data.retryable
      error.data = data
    } catch {
      // Use statusText if JSON parse fails
    }
    throw error
  }

  const contentType = response.headers.get('content-type')
  if (contentType?.includes('application/json')) {
    return response.json()
  }
  return response.text() as unknown as T
}

let refreshPromise: Promise<boolean> | null = null

async function tryRefreshToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) return false
      const data = (await res.json()) as { accessToken?: string; sessionToken?: string; user?: unknown }
      const token = data.accessToken ?? data.sessionToken
      if (token) {
        localStorage.setItem('auth_token', token)
        if (data.user && typeof data.user === 'object' && 'id' in data.user) {
          localStorage.setItem('auth_user', JSON.stringify(data.user))
        }
        return true
      }
      return false
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()
  return refreshPromise
}

export interface ApiFetchOptions extends RequestInit {
  _skipRefresh?: boolean
  /** Idempotency key for POST/PUT - prevents duplicate operations */
  idempotencyKey?: string
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { _skipRefresh, idempotencyKey, ...fetchOptions } = options
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  const token = localStorage.getItem('auth_token')
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  if (idempotencyKey) {
    (headers as Record<string, string>)['Idempotency-Key'] = idempotencyKey
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include',
  })

  if (response.status === 401 && !_skipRefresh && !path.includes('/auth/refresh')) {
    const refreshed = await tryRefreshToken()
    if (refreshed) {
      const newToken = localStorage.getItem('auth_token')
      if (newToken) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
      }
      response = await fetch(url, {
        ...fetchOptions,
        headers,
        credentials: 'include',
      })
    }
  }

  if (!response.ok && response.status >= 500) {
    let data: unknown = {}
    try {
      data = await response.clone().json()
    } catch {
      // ignore
    }
    const existingId = extractIncidentIdFromResponse(data)
    const isErrorsReport = path.includes('/errors/report')
    if (!isErrorsReport && typeof window !== 'undefined') {
      const route = window.location.pathname + window.location.search
      const dispatchError = (incidentId: string) => {
        window.dispatchEvent(
          new CustomEvent('archject:server-error', {
            detail: { incidentId, errorContext: { route: window.location.pathname } },
          })
        )
      }
      if (existingId) {
        dispatchError(existingId)
      } else {
        reportError({
          route,
          url: window.location.href,
          method: (options.method as string) ?? 'GET',
          errorMessage: (data as { message?: string })?.message ?? response.statusText,
          tags: ['api-5xx'],
        }).then((res) => {
          dispatchError(res?.incidentId ?? crypto.randomUUID())
        })
      }
    }
  }

  return handleResponse<T>(response)
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers: HeadersInit = {}
  const token = localStorage.getItem('auth_token')
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
    credentials: 'include',
  })
  return handleResponse<T>(response)
}

export interface ApiPatchOptions {
  headers?: Record<string, string>
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    apiFetch<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      idempotencyKey,
    }),
  put: <T>(path: string, body?: unknown, idempotencyKey?: string) =>
    apiFetch<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
      idempotencyKey,
    }),
  patch: <T>(path: string, body?: unknown, options?: ApiPatchOptions) =>
    apiFetch<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
      headers: options?.headers,
    }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => apiUpload<T>(path, formData),
}
