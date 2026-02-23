import { api } from '@/lib/api'
import type { Job, CreateJobPayload } from '@/types/jobs'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

function normalizeJob(raw: Record<string, unknown>): Job {
  return {
    id: raw.id as string,
    projectId: (raw.project_id ?? raw.projectId) as string | null,
    userId: (raw.user_id ?? raw.userId) as string,
    type: (raw.type ?? 'GENERIC') as Job['type'],
    payload: (raw.payload ?? null) as Record<string, unknown> | null,
    status: (raw.status ?? 'QUEUED') as Job['status'],
    cancellable: !!(raw.cancellable ?? true),
    progressPercent: (raw.progress_percent ?? raw.progressPercent) as number | null,
    currentStep: (raw.current_step ?? raw.currentStep) as string | null,
    steps: (raw.steps ?? []) as Job['steps'],
    resultUrls: (raw.result_urls ?? raw.resultUrls ?? []) as Job['resultUrls'],
    error: (raw.error ?? null) as Job['error'],
    createdAt: (raw.created_at ?? raw.createdAt) as string,
    updatedAt: (raw.updated_at ?? raw.updatedAt) as string,
    completedAt: (raw.completed_at ?? raw.completedAt) as string | null,
    cancelledAt: (raw.cancelled_at ?? raw.cancelledAt) as string | null,
  }
}

export async function createJob(payload: CreateJobPayload): Promise<{ jobId: string; status: string }> {
  return api.post<{ jobId: string; status: string }>('/jobs', payload)
}

export async function getJobStatus(jobId: string): Promise<{ job: Job }> {
  const res = await api.get<{ job: Record<string, unknown> }>(`/jobs/${jobId}`)
  return { job: normalizeJob(res.job) }
}

export async function cancelJob(jobId: string): Promise<{ job: Partial<Job> }> {
  const res = await api.post<{ job: Record<string, unknown> }>(`/jobs/${jobId}/cancel`)
  return { job: normalizeJob(res.job) }
}

export async function listJobs(params?: {
  projectId?: string
  type?: string
  status?: string
  limit?: number
  offset?: number
}): Promise<{ jobs: Partial<Job>[] }> {
  const search = new URLSearchParams()
  if (params?.projectId) search.set('projectId', params.projectId)
  if (params?.type) search.set('type', params.type)
  if (params?.status) search.set('status', params.status)
  if (params?.limit != null) search.set('limit', String(params.limit))
  if (params?.offset != null) search.set('offset', String(params.offset))
  const qs = search.toString()
  return api.get<{ jobs: Partial<Job>[] }>(`/jobs${qs ? `?${qs}` : ''}`)
}

export function getJobStreamUrl(jobId: string): string {
  const token = localStorage.getItem('auth_token')
  const base = API_BASE.startsWith('http') ? API_BASE : `${window.location.origin}${API_BASE.startsWith('/') ? API_BASE : `/${API_BASE}`}`
  return `${base.replace(/\/$/, '')}/jobs/${jobId}/stream?token=${encodeURIComponent(token || '')}`
}

export async function downloadResult(url: string): Promise<void> {
  const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`
  const token = localStorage.getItem('auth_token')
  const res = await fetch(fullUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const contentDisposition = res.headers.get('Content-Disposition')
  const match = contentDisposition?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] || 'export'
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
