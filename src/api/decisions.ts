import { api } from '@/lib/api'
import type { Decision } from '@/types'

export interface DecisionAttachment {
  id: string
  fileId: string
  decisionId: string
  filename: string
  filetype: string
  size: number
  thumbnailUrl?: string
  notes?: string
  attachedAt: string
  downloadUrl: string
}

export interface DecisionHistoryEntry {
  id: string
  decisionId: string
  action: string
  performedBy?: string
  timestamp: string
  details?: Record<string, unknown>
}

export async function getDecisions(projectId: string, includeDeleted?: boolean): Promise<Decision[]> {
  const qs = includeDeleted ? '?includeDeleted=true' : ''
  return api.get<Decision[]>(`/projects/${projectId}/decisions${qs}`)
}

export async function getDecision(
  projectId: string,
  decisionId: string,
  includeDeleted?: boolean
): Promise<Decision & { etag?: string; version?: number }> {
  const qs = includeDeleted ? '?includeDeleted=true' : ''
  return api.get<Decision & { etag?: string; version?: number }>(
    `/projects/${projectId}/decisions/${decisionId}${qs}`
  )
}

export async function updateDecision(
  projectId: string,
  decisionId: string,
  payload: Partial<{ title: string; description: string; options: unknown[] }>,
  etag?: string
): Promise<{ decisionId: string; status: string }> {
  const options = etag ? { headers: { 'If-Match': `"${etag}"` } } : undefined
  return api.patch<{ decisionId: string; status: string }>(
    `/projects/${projectId}/decisions/${decisionId}`,
    payload,
    options
  )
}

export async function deleteDecision(
  projectId: string,
  decisionId: string
): Promise<{ id: string; deleted: boolean; deletedAt?: string }> {
  return api.delete<{ id: string; deleted: boolean; deletedAt?: string }>(
    `/projects/${projectId}/decisions/${decisionId}`
  )
}

export async function restoreDecision(
  decisionId: string
): Promise<{ id: string; restored: boolean; updatedAt?: string }> {
  return api.post<{ id: string; restored: boolean; updatedAt?: string }>(
    `/decisions/${decisionId}/restore`
  )
}

export async function getDecisionHistory(
  decisionId: string
): Promise<{ entries: DecisionHistoryEntry[] }> {
  return api.get<{ entries: DecisionHistoryEntry[] }>(`/decisions/${decisionId}/history`)
}

export async function getDecisionAttachments(
  projectId: string,
  decisionId: string
): Promise<{ attachments: DecisionAttachment[] }> {
  return api.get<{ attachments: DecisionAttachment[] }>(
    `/projects/${projectId}/decisions/${decisionId}/attachments`
  )
}
