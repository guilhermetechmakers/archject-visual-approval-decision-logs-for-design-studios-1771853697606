import { api } from '@/lib/api'

export interface ConfirmationMetadata {
  decisionId: string
  status: string
  lastConfirmedAt: string | null
  lastConfirmedBy: { userId?: string | null; clientName?: string | null }
  referenceId: string | null
}

export async function getDecisionConfirmation(decisionId: string): Promise<ConfirmationMetadata> {
  return api.get<ConfirmationMetadata>(`/v1/decisions/${decisionId}/confirmation`)
}
