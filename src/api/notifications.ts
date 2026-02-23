import { api } from '@/lib/api'

export type NotificationType = 'reminder' | 'approval' | 'comment' | 'export'
export type NotificationFrequency = 'immediate' | 'daily_digest' | 'weekly_digest'

export interface NotificationItem {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedDecisionId: string | null
  relatedProjectId: string | null
  readAt: string | null
  createdAt: string
  source: string
  attachments: string[]
}

export interface NotificationsResponse {
  items: NotificationItem[]
  total: number
  page: number
  limit: number
}

export interface NotificationSettings {
  id: string | null
  userId: string
  inAppEnabled: boolean
  emailEnabled: boolean
  defaultFrequency: NotificationFrequency
  perProjectSettings: Array<{
    projectId: string
    projectName?: string
    inAppEnabled: boolean
    emailEnabled: boolean
    frequency: string
  }>
  lastUpdated: string | null
}

export interface ReminderTemplate {
  id: string
  name: string
  subject: string
  bodyHtml: string
  bodyText: string
  placeholders: string[]
  updatedAt: string
}

export interface NotificationFilters {
  type?: NotificationType
  projectId?: string
  readStatus?: 'read' | 'unread'
  page?: number
  limit?: number
}

export type NotificationsListParams = NotificationFilters
export type NotificationSettingsPayload = Partial<NotificationSettings>
export type ReminderTemplatePayload = Partial<Pick<ReminderTemplate, 'name' | 'subject' | 'bodyHtml' | 'bodyText' | 'placeholders'>>

export async function getNotifications(filters?: NotificationFilters): Promise<NotificationsResponse> {
  const params = new URLSearchParams()
  if (filters?.type) params.set('type', filters.type)
  if (filters?.projectId) params.set('project_id', filters.projectId)
  if (filters?.readStatus) params.set('read_status', filters.readStatus)
  if (filters?.page) params.set('page', String(filters.page))
  if (filters?.limit) params.set('limit', String(filters.limit))
  const qs = params.toString()
  return api.get<NotificationsResponse>(`/notifications${qs ? `?${qs}` : ''}`)
}

export async function markNotificationsRead(notificationIds?: string[]): Promise<void> {
  await api.post('/notifications/mark-read', { notification_ids: notificationIds })
}

export async function markNotificationsUnread(notificationIds?: string[]): Promise<void> {
  await api.post('/notifications/mark-unread', { notification_ids: notificationIds ?? [] })
}

export async function muteProjectNotifications(projectId: string): Promise<void> {
  await api.post('/notifications/mute', { project_id: projectId })
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  return api.get<NotificationSettings>('/notification-settings')
}

export async function updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<void> {
  await api.put('/notification-settings', settings)
}

export async function getReminderTemplates(): Promise<ReminderTemplate[]> {
  return api.get<ReminderTemplate[]>('/reminder-templates')
}

export async function updateReminderTemplate(
  id: string,
  data: Partial<Pick<ReminderTemplate, 'name' | 'subject' | 'bodyHtml' | 'bodyText' | 'placeholders'>>
): Promise<void> {
  await api.put(`/reminder-templates/${id}`, data)
}

export async function triggerTestPreview(templateId: string): Promise<{ subject: string; bodyHtml: string }> {
  return api.post<{ subject: string; bodyHtml: string }>('/notifications/trigger-test', {
    template_id: templateId,
  })
}
