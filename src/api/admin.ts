import { handleResponse } from '@/lib/api'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const ADMIN_BASE = '/admin'

function getAdminToken(): string | null {
  return localStorage.getItem('admin_token')
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  const token = getAdminToken()
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(url, { ...options, headers })
  return handleResponse<T>(response)
}

export interface AdminMetricsSummary {
  activeStudios: number
  dailyApprovals: number
  avgTurnaroundSeconds: number
  platformErrorRate: number
}

export interface MetricsSeriesPoint {
  date: string
  value: number
}

export interface HealthService {
  id: string
  name: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  lastChecked: string
  message: string | null
}

export interface AdminUser {
  id: string
  email: string
  name: string
  studioId: string | null
  status: 'active' | 'suspended'
  role: string
  lastLoginAt: string | null
  createdAt: string
}

export interface AdminSession {
  sessionId: string
  userId: string
  userName?: string
  device: string
  ip: string
  lastActiveAt: string
}

export interface SupportTicket {
  id: string
  projectId: string | null
  subject: string
  status: string
  priority: string
  assignedAdminId: string | null
  createdAt: string
  updatedAt: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  author_id: string | null
  body: string
  internal_note: number
  created_at: string
}

export interface AuditLogEntry {
  id: string
  actor_id: string
  action_type: string
  target_type: string
  target_id: string
  before_data: string | null
  after_data: string | null
  ip: string | null
  created_at: string
}

export const adminApi = {
  login: (email: string, password: string) =>
    adminFetch<{ token: string; admin: { id: string; email: string; name: string; role: string } }>(
      `${ADMIN_BASE}/login`,
      { method: 'POST', body: JSON.stringify({ email, password }) }
    ),

  getMetricsSummary: () => adminFetch<AdminMetricsSummary>(`${ADMIN_BASE}/metrics/summary`),
  getMetricsSeries: (metric: string, range: number) =>
    adminFetch<{ series: MetricsSeriesPoint[] }>(`${ADMIN_BASE}/metrics/series?metric=${metric}&range=${range}`),

  getHealth: () => adminFetch<{ services: HealthService[]; overall: string }>(`${ADMIN_BASE}/health`),
  runHealthCheck: (service: string) =>
    adminFetch<{ service: string; status: string; lastChecked: string }>(
      `${ADMIN_BASE}/health/check?service=${service}`,
      { method: 'POST' }
    ),

  getUsers: (params?: { q?: string; status?: string; page?: number; perPage?: number }) => {
    const search = new URLSearchParams()
    if (params?.q) search.set('q', params.q)
    if (params?.status) search.set('status', params.status)
    if (params?.page) search.set('page', String(params.page))
    if (params?.perPage) search.set('perPage', String(params.perPage))
    return adminFetch<{ users: AdminUser[]; total: number; page: number; perPage: number }>(
      `${ADMIN_BASE}/users?${search}`
    )
  },
  updateUser: (id: string, data: { status?: string; role?: string }) =>
    adminFetch<{ id: string; status?: string; role?: string }>(`${ADMIN_BASE}/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  inviteUser: (email: string, studioId?: string, role?: string) =>
    adminFetch<{ id: string; email: string; status: string }>(`${ADMIN_BASE}/users/invite`, {
      method: 'POST',
      body: JSON.stringify({ email, studioId, role: role || 'member' }),
    }),

  getSessions: (params?: { userId?: string; page?: number }) => {
    const search = new URLSearchParams()
    if (params?.userId) search.set('userId', params.userId)
    if (params?.page) search.set('page', String(params.page))
    return adminFetch<{ sessions: AdminSession[]; total: number; page: number; perPage: number }>(
      `${ADMIN_BASE}/sessions?${search}`
    )
  },
  revokeSession: (sessionId: string) => adminFetch<{ success: boolean }>(`${ADMIN_BASE}/sessions/${sessionId}`, { method: 'DELETE' }),
  revokeAllSessions: (userId: string) =>
    adminFetch<{ success: boolean }>(`${ADMIN_BASE}/sessions/revoke-all?userId=${userId}`, { method: 'POST' }),

  getTickets: (params?: { status?: string; priority?: string; page?: number; perPage?: number }) => {
    const search = new URLSearchParams()
    if (params?.status) search.set('status', params.status)
    if (params?.priority) search.set('priority', params.priority)
    if (params?.page) search.set('page', String(params.page))
    if (params?.perPage) search.set('perPage', String(params.perPage))
    return adminFetch<{ tickets: SupportTicket[]; total: number; page: number; perPage: number }>(
      `${ADMIN_BASE}/tickets?${search}`
    )
  },
  getTicket: (id: string) =>
    adminFetch<SupportTicket & { messages: TicketMessage[] }>(`${ADMIN_BASE}/tickets/${id}`),
  replyTicket: (id: string, body: string, internalNote?: boolean) =>
    adminFetch<{ id: string; body: string; internalNote: boolean }>(`${ADMIN_BASE}/tickets/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ body, internalNote }),
    }),
  updateTicket: (id: string, data: { assign?: string; status?: string }) =>
    adminFetch<{ id: string }>(`${ADMIN_BASE}/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  getAuditLogs: (params?: { actor?: string; action?: string; page?: number; perPage?: number }) => {
    const search = new URLSearchParams()
    if (params?.actor) search.set('actor', params.actor)
    if (params?.action) search.set('action', params.action)
    if (params?.page) search.set('page', String(params.page))
    if (params?.perPage) search.set('perPage', String(params.perPage))
    return adminFetch<{ logs: AuditLogEntry[]; total: number; page: number; perPage: number }>(
      `${ADMIN_BASE}/audit-logs?${search}`
    )
  },

  createExport: (type: 'csv' | 'pdf', params?: Record<string, unknown>, scheduledCron?: string) =>
    adminFetch<{ id: string; status: string; type: string }>(`${ADMIN_BASE}/exports`, {
      method: 'POST',
      body: JSON.stringify({ type, params, scheduledCron }),
    }),
  getExport: (id: string) => adminFetch<{ id: string; status: string; file_url?: string }>(`${ADMIN_BASE}/exports/${id}`),
  runExportNow: (id: string) =>
    adminFetch<{ id: string; status: string }>(`${ADMIN_BASE}/exports/${id}/run-now`, { method: 'POST' }),

  getAnalyticsApprovals: (params?: { groupBy?: string; from?: string; to?: string }) => {
    const search = new URLSearchParams()
    if (params?.groupBy) search.set('groupBy', params.groupBy)
    if (params?.from) search.set('from', params.from)
    if (params?.to) search.set('to', params.to)
    return adminFetch<{ groupBy: string; data: { group: string; approvals: number; avgTurnaround: number }[] }>(
      `${ADMIN_BASE}/analytics/approvals?${search}`
    )
  },
  getAnalyticsBottlenecks: (params?: { from?: string; to?: string; studioId?: string }) => {
    const search = new URLSearchParams()
    if (params?.from) search.set('from', params.from)
    if (params?.to) search.set('to', params.to)
    if (params?.studioId) search.set('studioId', params.studioId)
    return adminFetch<{ bottlenecks: unknown[] }>(`${ADMIN_BASE}/analytics/bottlenecks?${search}`)
  },

  toggleMaintenanceMode: () =>
    adminFetch<{ enabled: boolean }>(`${ADMIN_BASE}/maintenance-mode`, { method: 'POST' }),
}

export function setAdminToken(token: string) {
  localStorage.setItem('admin_token', token)
}

export function clearAdminToken() {
  localStorage.removeItem('admin_token')
}

export function hasAdminToken(): boolean {
  return !!getAdminToken()
}
