import { api } from '@/lib/api'
import type { Export, CreateExportPayload, CreateExportResponse } from '@/types/exports'

export interface ExportDetail {
  id: string
  status: string
  type: string
  fileUrl?: string
  fileName?: string
  signed?: boolean
  signatureHash?: string | null
  meta?: Record<string, unknown>
}

function normalizeExport(raw: Record<string, unknown>): Export {
  return {
    id: (raw.id ?? raw.export_id) as string,
    projectId: (raw.projectId ?? raw.project_id) as string,
    createdBy: (raw.createdBy ?? raw.created_by) as string | null,
    createdAt: (raw.createdAt ?? raw.created_at) as string,
    status: (raw.status ?? 'queued') as Export['status'],
    type: (raw.type ?? 'pdf') as Export['type'],
    fileKey: (raw.fileKey ?? raw.file_key) as string | null,
    fileName: (raw.fileName ?? raw.file_name) as string | null,
    fileSize: (raw.fileSize ?? raw.file_size) as number | null,
    signed: raw.signed === true || raw.signed === 1,
    signatureHash: (raw.signatureHash ?? raw.signature_hash) as string | null,
    jobId: (raw.jobId ?? raw.job_id) as string | null,
    meta: (raw.meta ?? null) as Export['meta'],
    downloadCount: (raw.downloadCount ?? raw.download_count ?? 0) as number,
    expiresAt: (raw.expiresAt ?? raw.expires_at) as string | null,
    fileUrl: (raw.fileUrl ?? raw.file_url) as string | null,
  }
}

export async function getExport(exportId: string): Promise<ExportDetail> {
  const res = await api.get<Record<string, unknown>>(`/v1/exports/${exportId}`)
  return {
    id: res.id as string,
    status: res.status as string,
    type: res.type as string,
    fileUrl: (res.file_url ?? res.fileUrl) as string | undefined,
    fileName: (res.file_name ?? res.fileName) as string | undefined,
    signed: res.signed === true || res.signed === 1,
    signatureHash: (res.signature_hash ?? res.signatureHash) as string | null | undefined,
    meta: res.meta as Record<string, unknown> | undefined,
  }
}

export async function listExports(projectId: string, limit = 20): Promise<{ exports: Export[] }> {
  const res = await api.get<{ exports: Record<string, unknown>[] }>(
    `/v1/exports?projectId=${encodeURIComponent(projectId)}&limit=${limit}`
  )
  return {
    exports: (res.exports ?? []).map(normalizeExport),
  }
}

/** List exports across all projects for the current user (recent first) */
export async function listExportsAll(limit = 30): Promise<{ exports: Export[] }> {
  const res = await api.get<{ exports: Record<string, unknown>[] }>(
    `/v1/exports?limit=${limit}`
  )
  return {
    exports: (res.exports ?? []).map(normalizeExport),
  }
}

export async function createExport(payload: CreateExportPayload): Promise<CreateExportResponse> {
  return api.post<CreateExportResponse>('/v1/exports', {
    projectId: payload.projectId,
    decisionIds: payload.decisionIds,
    types: payload.types,
    options: payload.options,
  })
}

/** Download export file by ID */
export async function downloadExport(exportId: string, fileName?: string): Promise<void> {
  const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
  const token = localStorage.getItem('auth_token')
  const url = `${API_BASE}/v1/exports/${exportId}/download`
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
  })
  if (!res.ok) throw new Error('Download failed')
  const blob = await res.blob()
  const contentDisposition = res.headers.get('Content-Disposition')
  const match = contentDisposition?.match(/filename="?([^"]+)"?/)
  const filename = match?.[1] ?? fileName ?? `export-${exportId.slice(0, 8)}.pdf`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  URL.revokeObjectURL(a.href)
}
