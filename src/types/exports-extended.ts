/** Extended types for Exports & Decision Logs module */

export type ExportFormat = 'PDF' | 'CSV'

export type ExportJobStatus = 'processing' | 'ready' | 'failed'

export interface CreateExportPayload {
  projectId: string
  decisionIds: string[]
  format: ExportFormat
  includeAttachments?: boolean
  brandingProfileId?: string
  signatureRequested?: boolean
  coverOptions?: { title?: string; subtitle?: string }
}

export interface CreateExportResponse {
  jobId: string
  status: string
}

export interface ExportJobStatusResponse {
  status: ExportJobStatus
  progress?: number
  downloadUrl?: string
  error?: string
}

export interface BrandingProfile {
  id: string
  studioId: string
  name: string
  logoUrl?: string | null
  colorHex?: string | null
  domain?: string | null
  font?: string | null
  headerMarkdown?: string | null
  isActive: boolean
}

export interface AuditLogEntry {
  id: string
  decisionId: string
  action: string
  performedBy: string | null
  timestamp: string
  details?: Record<string, unknown> | null
}

export interface ExportHistoryItem {
  id: string
  exportJobId: string
  userId: string
  projectId: string
  decisionCount: number
  format: string
  includeAttachments: boolean
  brandingProfileId?: string | null
  signed: boolean
  status: string
  createdAt: string
  completedAt?: string | null
  downloadUrl?: string | null
}
