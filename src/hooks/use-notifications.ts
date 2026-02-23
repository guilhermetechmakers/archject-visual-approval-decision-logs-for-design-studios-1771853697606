import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getNotifications,
  markNotificationsRead,
  markNotificationsUnread,
  muteProjectNotifications,
  getNotificationSettings,
  updateNotificationSettings,
  getReminderTemplates,
  updateReminderTemplate,
  type NotificationFilters,
} from '@/api/notifications'

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: NotificationFilters) => [...notificationKeys.all, 'list', params] as const,
  settings: () => [...notificationKeys.all, 'settings'] as const,
  templates: () => [...notificationKeys.all, 'templates'] as const,
  dashboardSummary: () => ['dashboard-notifications-summary'] as const,
}

export function useNotifications(params?: NotificationFilters) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => getNotifications(params),
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationIds?: string[]) => markNotificationsRead(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      queryClient.invalidateQueries({ queryKey: notificationKeys.dashboardSummary() })
      toast.success('Notifications marked as read')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to mark as read')
    },
  })
}

export function useMarkNotificationsUnread() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (notificationIds: string[]) => markNotificationsUnread(notificationIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      queryClient.invalidateQueries({ queryKey: notificationKeys.dashboardSummary() })
      toast.success('Notifications marked as unread')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to mark as unread')
    },
  })
}

export function useMuteProjectNotifications() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectId: string) => muteProjectNotifications(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
      queryClient.invalidateQueries({ queryKey: notificationKeys.settings() })
      toast.success('Project notifications muted')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to mute notifications')
    },
  })
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: notificationKeys.settings(),
    queryFn: getNotificationSettings,
  })
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateNotificationSettings>[0]) => updateNotificationSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.settings() })
      toast.success('Notification settings saved')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to save settings')
    },
  })
}

export function useReminderTemplates() {
  return useQuery({
    queryKey: notificationKeys.templates(),
    queryFn: getReminderTemplates,
  })
}

export function useUpdateReminderTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateReminderTemplate>[1] }) =>
      updateReminderTemplate(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.templates() })
      toast.success('Template updated')
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to update template')
    },
  })
}
