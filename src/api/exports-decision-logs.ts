import { api } from '@/lib/api'
import type {
  CreateExportPayload,
  CreateExportResponse,
  ExportJobStatusResponse,
  BrandingProfile,
  AuditLogEntry,
  ExportHistoryItem,
} from '@/types/exports-extended'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

/** Create an export job (PDF or CSV) */
export async function createExport(payload: CreateExportPayload): Promise<CreateExportResponse> {
  return api.post<CreateExportResponse>('/exports/create', payload)
}

/** Get export job status */
export async function getExportJobStatus(jobId: string): Promise<ExportJobStatusResponse> {
  const res = await api.get<{
    status: string
    progress?: number
    downloadUrl?: string
    error?: string
  }>(`/exports/${jobId}/status`)
  return {
    status: res.status as ExportJobStatusResponse['status'],
    progress: res.progress,
    downloadUrl: res.downloadUrl,
    error: res.error,
  }
}

/** Download export file - returns blob URL for download */
export async function downloadExport(jobId: string, filename?: string): Promise<void> {
  const token = localStorage.getItem('auth_token')
  const path = `${API_BASE.replace(/\/$/, '')}/exports/${jobId}/download`
  const url = path.startsWith('http') ? path : `${window.location.origin}${path.startsWith('/') ? '' : '/'}${path}`
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const contentDisposition = res.headers.get('Content-Disposition')
  const match = contentDisposition?.match(/filename="?([^"]+)"?/)
  const name = match?.[1] ?? filename ?? `export-${jobId.slice(0, 8)}.pdf`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  URL.revokeObjectURL(a.href)
}

/** List branding profiles (studio branding) */
export async function listBrandingProfiles(): Promise<BrandingProfile[]> {
  const res = await api.get<{ profiles: BrandingProfile[] }>('/branding/profiles')
  return res.profiles ?? []
}

/** Create or update branding profile */
export async function saveBrandingProfile(data: Partial<BrandingProfile> & { name: string }): Promise<BrandingProfile> {
  return api.post<BrandingProfile>('/branding/profiles', data)
}

/** Get full audit trail for a decision */
export async function getDecisionAudit(decisionId: string): Promise<AuditLogEntry[]> {
  const res = await api.get<{ entries: AuditLogEntry[] }>(`/decision-logs/${decisionId}/audit`)
  return res.entries ?? []
}

/** List export history (all projects or filtered by project) */
export async function listExportHistory(projectId?: string, limit = 20): Promise<ExportHistoryItem[]> {
  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  params.set('limit', String(limit))
  const res = await api.get<{ exports: ExportHistoryItem[] }>(`/exports/history?${params}`)
  return res.exports ?? []
}
