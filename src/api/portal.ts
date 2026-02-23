/**
 * Portal API - token-authenticated endpoints for client portal (no login).
 * Uses token in URL/query; does not use auth_token from localStorage.
 */
import { handleResponse, type ApiError } from '@/lib/api'
import type {
  PortalDecision,
  PortalComment,
  PortalApproval,
  PortalNotification,
  PortalBranding,
} from '@/types/portal'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

function portalFetch<T>(
  path: string,
  _token: string,
  options: RequestInit & { body?: unknown } = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${API_BASE}${path}`
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  }).then(handleResponse<T>)
}

function portalPost<T>(path: string, token: string, body?: unknown): Promise<T> {
  return portalFetch<T>(path, token, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  })
}

/** GET /v1/client/:token - list decisions for token (single decision for legacy) */
export async function getPortalDecisions(token: string): Promise<PortalDecision[]> {
  const res = await portalFetch<PortalDecision | PortalDecision[]>(
    `/v1/client/${encodeURIComponent(token)}`,
    token
  )
  return Array.isArray(res) ? res : [res]
}

/** GET /v1/client/:token/decision/:decisionId - detailed decision */
export async function getPortalDecision(
  token: string,
  decisionId: string
): Promise<PortalDecision> {
  return portalFetch<PortalDecision>(
    `/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}`,
    token
  )
}

/** POST /v1/client/:token/decision/:decisionId/comment */
export async function postPortalComment(
  token: string,
  decisionId: string,
  body: { content: string; parentCommentId?: string; mentionIds?: string[] }
): Promise<PortalComment> {
  return portalPost<PortalComment>(
    `/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}/comment`,
    token,
    body
  )
}

/** POST /v1/client/:token/decision/:decisionId/approve */
export async function postPortalApproval(
  token: string,
  decisionId: string,
  body: { optionId: string; approverName?: string; note?: string }
): Promise<PortalApproval> {
  return portalPost<PortalApproval>(
    `/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}/approve`,
    token,
    body
  )
}

/** POST /v1/client/:token/decision/:decisionId/export */
export async function postPortalExport(
  token: string,
  decisionId: string,
  body?: { format?: 'pdf' | 'csv' }
): Promise<{ jobId?: string; url?: string }> {
  return portalPost(
    `/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}/export`,
    token,
    body ?? {}
  )
}

/** POST /v1/client/:token/decision/:decisionId/followup */
export async function postPortalFollowUp(
  token: string,
  decisionId: string,
  body: { title: string; description?: string }
): Promise<{ id: string }> {
  return portalPost(
    `/v1/client/${encodeURIComponent(token)}/decision/${encodeURIComponent(decisionId)}/followup`,
    token,
    body
  )
}

/** GET /v1/client/:token/notifications */
export async function getPortalNotifications(token: string): Promise<PortalNotification[]> {
  return portalFetch<PortalNotification[]>(
    `/v1/client/${encodeURIComponent(token)}/notifications`,
    token
  )
}

/** GET /v1/client/token/validate?token= - token status */
export async function getPortalTokenStatus(token: string): Promise<{ valid: boolean; projectId: string; allowedDecisionIds: string[]; message?: string }> {
  try {
    const res = await portalFetch<{ valid: boolean; projectId: string; allowedDecisionIds: string[] }>(
      `/v1/client/token/validate?token=${encodeURIComponent(token)}`,
      token
    )
    return { ...res, valid: true }
  } catch (err) {
    const e = err as ApiError
  return {
    valid: false,
    message: e.message ?? 'Invalid or expired token',
    projectId: '',
    allowedDecisionIds: [],
  }
}
}

/** GET /v1/client/:token/branding */
export async function getPortalBranding(token: string): Promise<PortalBranding | null> {
  try {
    return await portalFetch<PortalBranding>(
      `/v1/client/${encodeURIComponent(token)}/branding`,
      token
    )
  } catch {
    return null
  }
}
