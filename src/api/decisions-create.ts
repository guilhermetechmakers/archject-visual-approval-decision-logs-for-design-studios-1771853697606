import { api } from '@/lib/api'

export interface DecisionTemplate {
  id: string
  name: string
  description: string
  defaultOptions: { title: string; description?: string; isDefault?: boolean; isRecommended?: boolean }[]
  previewAssets: string[]
}

export interface DecisionOptionDraft {
  id?: string
  title: string
  description?: string
  isDefault?: boolean
  isRecommended?: boolean
  attachments?: { id: string; filePath: string; previewUrl?: string }[]
}

export interface RecipientDraft {
  id?: string
  contactEmail: string
  role: 'client' | 'observer'
}

export interface ReminderDraft {
  id?: string
  type: 'email' | 'in-app'
  schedule: string
  message?: string
}

export interface DraftDecision {
  id?: string
  projectId: string
  title: string
  description?: string
  templateId?: string | null
  fromScratch?: boolean
  status: 'draft' | 'published'
  options: DecisionOptionDraft[]
  approvalDeadline?: string
  reminders: ReminderDraft[]
  clientMustTypeNameToConfirm?: boolean
  recipients: RecipientDraft[]
  clientLink?: string
}

export interface CreateDecisionPayload {
  templateId?: string
  fromScratch?: boolean
  title?: string
  description?: string
  options?: { title: string; description?: string; isDefault?: boolean; isRecommended?: boolean }[]
}

export interface PublishResponse {
  decisionId: string
  status: string
  clientLink: string
}

export async function getTemplates(): Promise<{ templates: DecisionTemplate[] }> {
  return api.get<{ templates: DecisionTemplate[] }>('/templates')
}

export async function createDecision(projectId: string, payload: CreateDecisionPayload): Promise<{ decisionId: string; status: string }> {
  return api.post<{ decisionId: string; status: string }>(`/projects/${projectId}/decisions`, payload)
}

export async function getDecision(projectId: string, decisionId: string): Promise<DraftDecision> {
  const res = await api.get<{
    id: string
    projectId: string
    title: string
    description?: string
    status: string
    options: { id: string; label: string; description?: string; isDefault?: boolean; isRecommended?: boolean }[]
    createdAt: string
    updatedAt: string
  }>(`/projects/${projectId}/decisions/${decisionId}`)
  return {
    ...res,
    status: (res.status === 'published' ? 'published' : 'draft') as 'draft' | 'published',
    options: res.options.map((o) => ({
      id: o.id,
      title: o.label,
      description: o.description,
      isDefault: o.isDefault,
      isRecommended: o.isRecommended,
    })),
    reminders: [],
    recipients: [],
  }
}

export async function updateDecision(
  projectId: string,
  decisionId: string,
  payload: Partial<{
    title: string
    description: string
    options: DecisionOptionDraft[]
    approvalDeadline: string
    reminders: ReminderDraft[]
    clientMustTypeNameToConfirm: boolean
    recipients: RecipientDraft[]
  }>
): Promise<{ decisionId: string; status: string }> {
  const body: Record<string, unknown> = { ...payload }
  if (payload.options) {
    body.options = payload.options.map((o) => ({
      id: o.id,
      title: o.title,
      description: o.description,
      isDefault: o.isDefault,
      isRecommended: o.isRecommended,
    }))
  }
  return api.put<{ decisionId: string; status: string }>(`/projects/${projectId}/decisions/${decisionId}`, body)
}

export async function publishDecision(projectId: string, decisionId: string): Promise<PublishResponse> {
  return api.post<PublishResponse>(`/projects/${projectId}/decisions/${decisionId}/publish`, {})
}
