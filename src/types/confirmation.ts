export type ConfirmedContext = 'internal' | 'client_token'

export interface LastConfirmedBy {
  userId?: string | null
  clientName?: string | null
}

export interface ConfirmationMetadata {
  decisionId: string
  status: string
  lastConfirmedAt: string | null
  lastConfirmedBy: LastConfirmedBy | null
  referenceId: string | null
}

export interface ConfirmActionPayload {
  source: 'internal' | 'client_token'
  token?: string
  exportOptions?: {
    types: ('csv' | 'pdf' | 'signed_pdf')[]
    includeAssets?: boolean
    branding?: string
  }
}

export interface ConfirmActionResponse {
  referenceId: string
  timestamp: string
  projectId: string
  exportJobId?: string
}

export interface ReferenceDataItem {
  label: string
  value: string
}

export interface CTAConfig {
  label: string
  action: () => void
}
