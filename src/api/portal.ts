/**
 * Portal API - token generation, link management, analytics, revocation.
 * Used by studio users to manage client share links.
 */
import { api } from '@/lib/api'

export interface PortalTokenGenerateRequest {
  project_id: string
  decision_ids: string[]
  allowed_actions?: string[]
  expires_in_minutes?: number
  client_identity_hint?: string
}

export interface PortalTokenGenerateResponse {
  token_id: string
  token: string
  clientLink: string
  expires_at: string
  decision_ids: string[]
  allowed_actions: string[]
}

export interface PortalLinkUsageStats {
  views: number
  comments: number
  approvals: number
  exports: number
}

export interface PortalLink {
  token_id: string
  project_id: string
  decision_ids: string[]
  scope: string
  expires_at: string
  created_at: string
  revoked: boolean
  last_used_at: string | null
  client_identity_hint: string | null
  usage_stats: PortalLinkUsageStats
}

export interface PortalLinkDetail {
  token_id: string
  project_id: string
  decision_ids: string[]
  expires_at: string
  revoked: boolean
  last_used_at: string | null
  client_identity_hint: string | null
  usage_stats: PortalLinkUsageStats
}

export interface PortalAnalytics {
  views: number
  comments: number
  approvals: number
  exports: number
  last_seen_at: string | null
}

/** POST /api/portal/token/generate - create tokenized client link */
export async function generatePortalToken(
  body: PortalTokenGenerateRequest
): Promise<PortalTokenGenerateResponse> {
  return api.post<PortalTokenGenerateResponse>('/portal/token/generate', body)
}

/** GET /api/portal/projects/:projectId/links - list client links for project */
export async function getProjectClientLinks(
  projectId: string
): Promise<{ links: PortalLink[] }> {
  return api.get<{ links: PortalLink[] }>(`/portal/projects/${projectId}/links`)
}

/** GET /api/portal/link/:tokenId - token metadata and usage */
export async function getPortalLinkDetail(
  tokenId: string
): Promise<PortalLinkDetail> {
  return api.get<PortalLinkDetail>(`/portal/link/${tokenId}`)
}

/** POST /api/portal/link/:tokenId/revoke */
export async function revokePortalLink(
  tokenId: string
): Promise<{ revoked: boolean }> {
  return api.post<{ revoked: boolean }>(`/portal/link/${tokenId}/revoke`, {})
}

/** GET /api/portal/analytics/:tokenId */
export async function getPortalLinkAnalytics(
  tokenId: string
): Promise<PortalAnalytics> {
  return api.get<PortalAnalytics>(`/portal/analytics/${tokenId}`)
}
