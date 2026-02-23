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

export interface DecisionComment {
  id: string
  decisionId: string
  parentCommentId?: string | null
  authorId: string
  authorName: string
  text: string
  timestamp: string
  attachments?: string[]
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

export async function cloneDecision(
  decisionId: string,
  projectId?: string
): Promise<{ decisionId: string; clonedFrom: string; projectId: string; status: string }> {
  return api.post<{ decisionId: string; clonedFrom: string; projectId: string; status: string }>(
    `/decisions/${decisionId}/clone`,
    projectId ? { projectId } : {}
  )
}

export async function archiveDecision(
  decisionId: string,
  _projectId?: string
): Promise<{ decisionId: string; archived: boolean; archivedAt?: string }> {
  return api.post<{ decisionId: string; archived: boolean; archivedAt?: string }>(
    `/decisions/${decisionId}/archive`,
    {}
  )
}

export async function getDecisionShareLink(
  projectId: string,
  decisionId: string
): Promise<{ decisionId: string; clientLink: string }> {
  return api.post<{ decisionId: string; clientLink: string }>(
    `/projects/${projectId}/decisions/${decisionId}/share`,
    {}
  )
}

export async function getDecisionComments(
  projectId: string,
  decisionId: string
): Promise<DecisionComment[]> {
  return api.get<DecisionComment[]>(
    `/projects/${projectId}/decisions/${decisionId}/comments`
  )
}

export async function postDecisionComment(
  projectId: string,
  decisionId: string,
  body: { text: string; parentCommentId?: string }
): Promise<DecisionComment> {
  return api.post<DecisionComment>(
    `/projects/${projectId}/decisions/${decisionId}/comments`,
    body
  )
}
