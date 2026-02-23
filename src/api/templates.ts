import { api } from '@/lib/api'
import type { TemplateLibraryItem, TemplateDetail, TemplateType } from '@/types'

export interface TemplatesListParams {
  projectId?: string
  type?: TemplateType
  q?: string
  tags?: string
  archived?: 'true' | 'false' | 'all'
  scope?: 'my' | 'all'
  page?: number
  limit?: number
}

export interface TemplatesListResponse {
  items: TemplateLibraryItem[]
  total: number
  page: number
  limit: number
}

export async function getTemplates(params: TemplatesListParams = {}): Promise<TemplatesListResponse> {
  const search = new URLSearchParams()
  if (params.projectId) search.set('projectId', params.projectId)
  if (params.type) search.set('type', params.type)
  if (params.q) search.set('q', params.q)
  if (params.tags) search.set('tags', params.tags)
  if (params.archived) search.set('archived', params.archived)
  if (params.scope) search.set('scope', params.scope)
  if (params.page) search.set('page', String(params.page))
  if (params.limit) search.set('limit', String(params.limit))
  const qs = search.toString()
  return api.get<TemplatesListResponse>(`/templates${qs ? `?${qs}` : ''}`)
}

export async function getTemplate(id: string): Promise<TemplateDetail> {
  return api.get<TemplateDetail>(`/templates/${id}`)
}

export interface CreateTemplatePayload {
  name: string
  description?: string
  type?: TemplateType
  content?: Record<string, unknown>
  tags?: string[]
  projectId?: string | null
  reminderSchedule?: string | null
}

export async function createTemplate(payload: CreateTemplatePayload): Promise<TemplateLibraryItem> {
  return api.post<TemplateLibraryItem>('/templates', payload)
}

export interface UpdateTemplatePayload {
  name?: string
  description?: string
  type?: TemplateType
  content?: Record<string, unknown>
  tags?: string[]
  reminderSchedule?: string | null
  versionNote?: string
}

export async function updateTemplate(id: string, payload: UpdateTemplatePayload): Promise<{ id: string; version: number; updatedAt: string }> {
  return api.put<{ id: string; version: number; updatedAt: string }>(`/templates/${id}`, payload)
}

export async function archiveTemplate(id: string, isArchived: boolean): Promise<void> {
  await api.patch(`/templates/${id}`, { isArchived })
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.delete(`/templates/${id}`)
}

export async function restoreTemplate(id: string): Promise<TemplateLibraryItem & { restored: boolean }> {
  return api.post<TemplateLibraryItem & { restored: boolean }>(`/templates/${id}/restore`)
}

export async function duplicateTemplate(id: string, projectId?: string | null): Promise<{ id: string; name: string; version: number; createdAt: string }> {
  return api.post<{ id: string; name: string; version: number; createdAt: string }>(`/templates/${id}/duplicate`, { projectId })
}

export async function getTemplateVersions(id: string): Promise<{ versions: TemplateDetail['versions'] }> {
  return api.get<{ versions: TemplateDetail['versions'] }>(`/templates/${id}/versions`)
}

export async function restoreTemplateVersion(templateId: string, versionId: string): Promise<{ id: string; version: number; updatedAt: string }> {
  return api.post<{ id: string; version: number; updatedAt: string }>(`/templates/${templateId}/versions/${versionId}/restore`, {})
}

export async function applyTemplate(
  projectId: string,
  templateId: string,
  scopeDetail?: { targetDecisions?: string[] }
): Promise<{ decisionId: string; applied: boolean; logId: string; scopeDetail?: Record<string, unknown> }> {
  return api.post(`/projects/${projectId}/apply-template`, { templateId, scopeDetail })
}

export async function importTemplates(
  templates: Array<{ name: string; description?: string; type?: string; content?: Record<string, unknown>; tags?: string[] }>
): Promise<{ imported: number; templates: Array<{ id: string; name: string; status: string }>; errors?: string[] }> {
  return api.post('/templates/import', { templates })
}

export async function importTemplatesFromFile(
  file: File
): Promise<{ imported: number; templates?: Array<{ id: string; name: string; status: string }>; errors?: string[] }> {
  const formData = new FormData()
  formData.append('file', file)
  const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`${API_BASE}/templates/import`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? 'Import failed')
  }
  return res.json()
}

export async function exportTemplates(templateIds: string[]): Promise<{ templates: unknown[]; exportedAt: string }> {
  return api.post('/templates/export', { templateIds })
}

export async function exportTemplatesAsFile(templateIds: string[]): Promise<Blob> {
  const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
  const token = localStorage.getItem('auth_token')
  const res = await fetch(`${API_BASE}/templates/export`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ templateIds }),
  })
  if (!res.ok) throw new Error('Export failed')
  return res.blob()
}
