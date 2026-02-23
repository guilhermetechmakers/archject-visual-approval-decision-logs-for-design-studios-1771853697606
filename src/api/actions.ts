import { api } from '@/lib/api'

export interface ConfirmActionPayload {
  source: 'internal' | 'client_token'
  token?: string
  exportOptions?: {
    types?: ('csv' | 'pdf' | 'signed_pdf')[]
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

export async function confirmAction(
  actionId: string,
  payload: ConfirmActionPayload
): Promise<ConfirmActionResponse> {
  return api.post<ConfirmActionResponse>(`/v1/actions/${actionId}/confirm`, payload)
}
