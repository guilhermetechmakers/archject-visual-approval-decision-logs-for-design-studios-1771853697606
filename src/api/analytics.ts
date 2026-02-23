import { api } from '@/lib/api'

export interface AnalyticsKPIs {
  medianApprovalSeconds: number
  pctWithinSla: number
  totalDecisions: number
  avgResponseSeconds: number
  pendingCount: number
}

export interface AnalyticsTrend {
  medianApprovalSeconds: number
  pctWithinSla: number
}

export interface ProjectAnalyticsResponse {
  projectId: string
  projectName: string
  start: string
  end: string
  kpis: AnalyticsKPIs
  heatmap: Record<string, Record<string, number>>
  distribution: { bucket: string; count: number; minSeconds: number; maxSeconds: number }[]
  trend: AnalyticsTrend
}

export interface SlowDecision {
  id: string
  projectId: string
  projectName: string
  title: string
  status: string
  type: string
  createdAt: string
  decisionMadeAt: string | null
  reviewerId: string | null
  timeToDecisionSeconds: number | null
}

export interface DecisionsResponse {
  decisions: SlowDecision[]
  total: number
  page: number
  limit: number
}

export interface ExportRecord {
  id: string
  scope: { projectId?: string; accountId?: string }
  filters: Record<string, unknown> | null
  format: 'csv' | 'json'
  status: string
  rowsCount: number | null
  createdAt: string
  completedAt: string | null
}

export interface Alert {
  id: string
  name: string
  scopeType: string
  scopeId: string | null
  metric: string
  operator: string
  thresholdValue: number
  frequencyMinutes: number
  channels: Record<string, unknown>
  enabled: boolean
  lastTriggeredAt: string | null
  createdAt: string
}

export const analyticsApi = {
  getProjectAnalytics: (projectId: string, params?: { start?: string; end?: string; groupBy?: string }) => {
    const search = new URLSearchParams()
    if (params?.start) search.set('start', params.start)
    if (params?.end) search.set('end', params.end)
    if (params?.groupBy) search.set('groupBy', params.groupBy)
    const qs = search.toString()
    return api.get<ProjectAnalyticsResponse>(
      `/projects/${projectId}/analytics${qs ? `?${qs}` : ''}`
    )
  },

  getDecisions: (params?: {
    projectId?: string
    start?: string
    end?: string
    status?: string
    type?: string
    reviewerId?: string
    page?: number
    limit?: number
    sort?: string
    sortDir?: string
  }) => {
    const search = new URLSearchParams()
    if (params?.projectId) search.set('projectId', params.projectId)
    if (params?.start) search.set('start', params.start)
    if (params?.end) search.set('end', params.end)
    if (params?.status) search.set('status', params.status)
    if (params?.type) search.set('type', params.type)
    if (params?.reviewerId) search.set('reviewerId', params.reviewerId)
    if (params?.page) search.set('page', String(params.page))
    if (params?.limit) search.set('limit', String(params.limit))
    if (params?.sort) search.set('sort', params.sort)
    if (params?.sortDir) search.set('sortDir', params.sortDir)
    return api.get<DecisionsResponse>(`/analytics/decisions?${search}`)
  },

  createExport: (scope: { projectId: string; accountId?: string }, filters?: Record<string, unknown>, format?: 'csv' | 'json') =>
    api.post<{ id: string; status: string; format: string }>('/exports', {
      scope,
      filters: filters || {},
      format: format || 'csv',
    }),

  getExportStatus: (exportId: string) =>
    api.get<{ id: string; status: string; rowsCount?: number; completedAt?: string }>(`/exports/${exportId}/status`),

  downloadExport: async (exportId: string, filename?: string) => {
    const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
    const token = localStorage.getItem('auth_token')
    const res = await fetch(`${API_BASE}/exports/${exportId}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error('Export download failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename ?? `export-${exportId.slice(0, 8)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  },

  getExports: (limit?: number) =>
    api.get<{ exports: ExportRecord[] }>(`/exports${limit ? `?limit=${limit}` : ''}`),

  getAlerts: (params?: { scope?: string; scopeId?: string }) => {
    const search = new URLSearchParams()
    if (params?.scope) search.set('scope', params.scope)
    if (params?.scopeId) search.set('scopeId', params.scopeId)
    return api.get<{ alerts: Alert[] }>(`/alerts${search.toString() ? `?${search}` : ''}`)
  },

  createAlert: (data: {
    name: string
    scopeType: string
    scopeId?: string
    metric: string
    operator: string
    thresholdValue: number
    frequencyMinutes?: number
    channels?: Record<string, unknown>
  }) => api.post<{ id: string; status: string }>('/alerts', data),

  updateAlert: (id: string, data: Partial<Alert>) =>
    api.put<{ id: string; status: string }>(`/alerts/${id}`, data),

  deleteAlert: (id: string) =>
    api.delete<{ id: string; status: string }>(`/alerts/${id}`),

  getProjects: () =>
    api.get<{ projects: { id: string; name: string }[] }>('/projects'),
}
