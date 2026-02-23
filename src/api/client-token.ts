import { api } from '@/lib/api'

export interface ValidateTokenResponse {
  valid: boolean
  projectId: string
  allowedDecisionIds: string[]
}

export async function validateClientToken(token: string): Promise<ValidateTokenResponse> {
  return api.get<ValidateTokenResponse>(`/v1/client/token/validate?token=${encodeURIComponent(token)}`)
}
