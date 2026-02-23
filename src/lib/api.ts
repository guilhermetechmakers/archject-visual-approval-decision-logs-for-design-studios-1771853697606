import {
  reportError,
  extractIncidentIdFromResponse,
} from '@/services/error-reporter'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface ApiError {
  message: string
  code?: string
  status?: number
  /** Response body for rate limit info etc. */
  data?: Record<string, unknown>
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error: ApiError = {
      message: response.statusText,
      status: response.status,
    }
    try {
      const data = await response.json()
      error.message = data.message ?? data.error ?? response.statusText
      error.code = data.code ?? data.error
      error.data = data as Record<string, unknown>
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

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { _skipRefresh?: boolean } = {}
): Promise<T> {
  const { _skipRefresh, ...fetchOptions } = options
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  const token = localStorage.getItem('auth_token')
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
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

export const api = {
  get: <T>(path: string) => apiFetch<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => apiUpload<T>(path, formData),
}
