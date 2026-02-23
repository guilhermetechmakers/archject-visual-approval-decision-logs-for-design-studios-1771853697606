import { api } from '@/lib/api'

export type ExportStatus = 'requested' | 'processing' | 'completed' | 'failed'
export type DeletionStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'failed'

export interface DataExport {
  id: string
  status: ExportStatus
  formats: string[]
  include: string[]
  size_bytes: number | null
  requested_at: string
  completed_at: string | null
  expires_at: string | null
  presigned_url?: string
}

export interface DeletionRequest {
  id: string
  status: DeletionStatus
  scheduled_for: string | null
  requested_at: string
  completed_at: string | null
}

export interface BackupSummary {
  cadence: string
  retention_days: number
  encryption: string
  snapshots: Array<{
    id: string
    job_timestamp: string
    snapshot_key: string | null
    retention_until: string | null
    size_bytes: number | null
    status: string
  }>
}

export interface CreateExportRequest {
  formats?: string[]
  include?: string[]
}

export interface CreateDeletionRequest {
  password: string
  retention_window_days?: number
}

export async function createExport(body?: CreateExportRequest): Promise<{ export_id: string; status: string }> {
  return api.post<{ export_id: string; status: string }>('/v1/privacy/exports', body)
}

export async function listExports(): Promise<DataExport[]> {
  return api.get<DataExport[]>('/v1/privacy/exports')
}

export async function getExport(id: string): Promise<DataExport & { error_message?: string }> {
  return api.get<DataExport & { error_message?: string }>(`/v1/privacy/exports/${id}`)
}

export async function createDeletion(body: CreateDeletionRequest): Promise<{
  deletion_id: string
  status: string
  scheduled_for: string
}> {
  return api.post<{ deletion_id: string; status: string; scheduled_for: string }>(
    '/v1/privacy/deletions',
    body
  )
}

export async function getDeletion(id: string): Promise<DeletionRequest> {
  return api.get<DeletionRequest>(`/v1/privacy/deletions/${id}`)
}

export async function getBackups(): Promise<BackupSummary> {
  return api.get<BackupSummary>('/v1/privacy/backups')
}
