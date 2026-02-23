import { api } from '@/lib/api'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface Studio {
  id: string
  name: string
  logo_url: string | null
  favicon_url?: string | null
  brand_color: string
  client_link_branding?: { enabled?: boolean; customDomain?: string; domainValidated?: boolean } | null
  default_currency?: string
  subscription?: {
    plan_id: string
    seats: number
    seats_used: number
    status: string
    billing_cycle: string
  } | null
  team_members: TeamMember[]
  email_templates?: EmailTemplate[]
  integrations?: { provider: string; enabled: boolean; connected_at: string }[]
}

export interface TeamMember {
  id: string
  email: string
  name: string | null
  role: string
  status: 'active' | 'pending'
  invited_at: string
}

export interface EmailTemplate {
  templateKey: string
  subject: string
  body: string
}

export interface AuditLogEntry {
  id: string
  action: string
  actor: string
  metadata: Record<string, unknown>
  created_at: string
}

const DEFAULT_STUDIO_ID = 'default'

export async function getStudio(id: string = DEFAULT_STUDIO_ID): Promise<Studio> {
  return api.get<Studio>(`/studios/${id}`)
}

export async function updateStudio(
  id: string,
  data: {
    name?: string
    logo_url?: string | null
    favicon_url?: string | null
    brand_color?: string
    client_link_branding?: { enabled: boolean; customDomain: string; domainValidated?: boolean }
  }
): Promise<Studio> {
  return api.put<Studio>(`/studios/${id}`, data)
}

export async function getEmailTemplates(studioId: string = DEFAULT_STUDIO_ID): Promise<EmailTemplate[]> {
  return api.get<EmailTemplate[]>(`/studios/${studioId}/email-templates`)
}

export async function updateEmailTemplate(
  studioId: string,
  key: string,
  data: { subject: string; body: string }
): Promise<EmailTemplate> {
  return api.put<EmailTemplate>(`/studios/${studioId}/email-templates/${key}`, data)
}

export async function inviteTeamMember(
  studioId: string,
  data: { email: string; role: string }
): Promise<TeamMember> {
  return api.post<TeamMember>(`/studios/${studioId}/team-members`, data)
}

export async function updateTeamMemberRole(
  studioId: string,
  memberId: string,
  role: string
): Promise<TeamMember> {
  return api.put<TeamMember>(`/studios/${studioId}/team-members/${memberId}`, { role })
}

export async function removeTeamMember(studioId: string, memberId: string): Promise<void> {
  return api.delete(`/studios/${studioId}/team-members/${memberId}`)
}

export async function getAuditLog(studioId: string = DEFAULT_STUDIO_ID): Promise<AuditLogEntry[]> {
  return api.get<AuditLogEntry[]>(`/studios/${studioId}/audit-log`)
}

export async function connectIntegration(studioId: string, provider: string): Promise<{ provider: string; enabled: boolean }> {
  return api.post<{ provider: string; enabled: boolean }>(`/studios/${studioId}/integrations/${provider}/connect`)
}

export async function disconnectIntegration(studioId: string, provider: string): Promise<{ provider: string; enabled: boolean }> {
  return api.post<{ provider: string; enabled: boolean }>(`/studios/${studioId}/integrations/${provider}/disconnect`)
}

export async function createWebhook(studioId: string, data: { url: string; events?: string[] }): Promise<{ id: string; url: string; events: string[] }> {
  return api.post<{ id: string; url: string; events: string[] }>(`/studios/${studioId}/webhooks`, data)
}

export async function deleteWebhook(webhookId: string): Promise<void> {
  return api.delete<void>(`/studios/webhooks/${webhookId}`)
}

export async function uploadLogo(file: File): Promise<{ url: string; key: string }> {
  const token = localStorage.getItem('auth_token')
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/uploads/logo`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? 'Upload failed')
  }

  return response.json()
}
