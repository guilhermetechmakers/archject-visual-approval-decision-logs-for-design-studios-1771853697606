export type ExportStatus = 'queued' | 'processing' | 'ready' | 'failed'

export type ExportType = 'csv' | 'pdf' | 'merged_pdf' | 'signed_pdf' | 'zip'

export interface ExportMeta {
  decisionIds?: string[]
  options?: Record<string, unknown>
  branding?: string
  brandingId?: string
}

export interface Export {
  id: string
  projectId: string
  createdBy: string | null
  createdAt: string
  status: ExportStatus
  type: ExportType
  fileKey?: string | null
  fileName?: string | null
  fileSize?: number | null
  signed: boolean
  signatureHash?: string | null
  jobId?: string | null
  meta?: ExportMeta | null
  downloadCount: number
  expiresAt?: string | null
  fileUrl?: string | null
}

export interface CreateExportPayload {
  projectId: string
  decisionIds: string[]
  types: ExportType[]
  options?: {
    includeImages?: boolean
    brandingId?: string
    signer?: {
      type: 'internal' | 'provider'
      providerId?: string
    }
  }
}

export interface CreateExportResponse {
  jobId: string
  exportIdsPending: string[]
}
