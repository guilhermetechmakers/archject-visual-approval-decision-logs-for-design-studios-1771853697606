/**
 * Client Portal API - token-authenticated endpoints.
 * No auth header; token is passed as query param or in path.
 */
import { handleResponse } from '@/lib/api'
import type {
  PortalDecision,
  PortalComment,
  PortalNotification,
  TokenStatus,
  PortalBranding,
} from '@/types/portal'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

function portalFetch<T>(path: string, options: { method?: string; body?: unknown; headers?: HeadersInit } = {}): Promise<T> {
  const { method = 'GET', body, headers: customHeaders } = options
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(customHeaders as Record<string, string>),
  }
  const init: RequestInit = {
    method,
    headers,
    credentials: 'include',
  }
  if (body !== undefined && method !== 'GET') {
    init.body = JSON.stringify(body)
  }
  return fetch(url, init).then(handleResponse<T>)
}

/** GET /v1/client/:token - single decision (legacy, first in list) */
export function getClientDecision(token: string): Promise<PortalDecision> {
  return portalFetch<PortalDecision>(`/v1/client/${encodeURIComponent(token)}`)
}

/** GET /v1/client/:token/decisions - list all decisions for token */
export function getClientDecisions(token: string): Promise<PortalDecision[]> {
  return portalFetch<PortalDecision[]>(`/v1/client/${encodeURIComponent(token)}/decisions`)
}

/** GET /v1/client/:token/decision/:decisionId - decision detail */
export function getClientDecisionDetail(
  token: string,
  decisionId: string
): Promise<PortalDecision> {
  return portalFetch<PortalDecision>(
    `/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}`
  )
}

/** GET /v1/client/:token/decision/:decisionId/comments */
export function getClientComments(
  token: string,
  decisionId: string
): Promise<PortalComment[]> {
  return portalFetch<PortalComment[]>(
    `/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}/comments`
  )
}

/** POST /v1/client/:token/decision/:decisionId/comment */
export function postClientComment(
  token: string,
  decisionId: string,
  body: { content: string; parentCommentId?: string; mentions?: string[] }
): Promise<PortalComment> {
  return portalFetch<PortalComment>(
    `/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}/comment`,
    { method: 'POST', body }
  )
}

/** POST /v1/actions/:decisionId/confirm - approve decision (client token) */
export function postClientApprove(
  token: string,
  decisionId: string,
  body?: { approverName?: string; optionId?: string; exportOptions?: { types?: string[] } }
): Promise<{ referenceId: string; timestamp: string; projectId: string }> {
  return portalFetch(`/v1/actions/${encodeURIComponent(decisionId)}/confirm`, {
    method: 'POST',
    body: {
      source: 'client_token',
      token,
      ...body,
    },
  })
}

/** POST /v1/client/:token/decision/:decisionId/export */
export function postClientExport(
  token: string,
  decisionId: string
): Promise<{ url?: string; jobId?: string }> {
  return portalFetch(`/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}/export`, {
    method: 'POST',
  })
}

/** POST /v1/client/:token/decision/:decisionId/followup */
export function postClientFollowUp(
  token: string,
  decisionId: string,
  body: { title: string; description?: string }
): Promise<{ id: string }> {
  return portalFetch(`/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}/followup`, {
    method: 'POST',
    body,
  })
}

/** GET /v1/client/:token/notifications */
export function getClientNotifications(token: string): Promise<PortalNotification[]> {
  return portalFetch<PortalNotification[]>(
    `/v1/client/${encodeURIComponent(token)}/notifications`
  )
}

/** GET /v1/client/:token/token/status - token status */
export async function getClientTokenStatus(token: string): Promise<TokenStatus> {
  try {
    return await portalFetch<TokenStatus>(
      `/v1/client/${encodeURIComponent(token)}/token/status`
    )
  } catch (err) {
    const e = err as { message?: string }
    return { valid: false, message: e.message ?? 'Invalid or expired token' }
  }
}

/** GET branding for client link (via token) */
export function getClientBranding(token: string): Promise<PortalBranding> {
  return portalFetch<PortalBranding>(`/v1/client/${encodeURIComponent(token)}/branding`)
}

/** Validate token - uses existing client-token API */
export function validateClientToken(token: string): Promise<{
  valid: boolean
  projectId: string
  allowedDecisionIds: string[]
}> {
  return portalFetch(
    `/v1/client/token/validate?token=${encodeURIComponent(token)}`
  )
}
