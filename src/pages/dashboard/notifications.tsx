import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Bell } from 'lucide-react'
import {
  getNotifications,
  getNotificationSettings,
  getReminderTemplates,
  markNotificationsRead,
  markNotificationsUnread,
  updateNotificationSettings,
  type NotificationType,
  type NotificationFrequency,
} from '@/api/notifications'
import {
  FiltersBar,
  BulkActionsBar,
  FeedList,
  SettingsPanel,
  QuickActionsDock,
} from '@/components/notifications-center'
import type { NotificationSettings } from '@/types'

export function NotificationsPage() {
  const queryClient = useQueryClient()
  const [typeFilter, setTypeFilter] = useState<'' | NotificationType>('')
  const [readStatusFilter, setReadStatusFilter] = useState<'all' | 'read' | 'unread'>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [settingsPatch, setSettingsPatch] = useState<Partial<NotificationSettings>>({})
  const [activeTab, setActiveTab] = useState<'in-app' | 'email' | 'templates'>('in-app')

  const filters = {
    type: typeFilter || undefined,
    readStatus: readStatusFilter !== 'all' ? readStatusFilter : undefined,
    page: 1,
    limit: 50,
  }

  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications', filters],
    queryFn: () => getNotifications(filters),
  })

  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: getNotificationSettings,
  })

  useQuery({
    queryKey: ['reminder-templates'],
    queryFn: getReminderTemplates,
  })

  const markReadMutation = useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-notifications-summary'] })
      setSelectedIds([])
      toast.success('Notifications marked as read')
    },
    onError: () => toast.error('Failed to mark as read'),
  })

  const markUnreadMutation = useMutation({
    mutationFn: (ids: string[]) => markNotificationsUnread(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-notifications-summary'] })
      setSelectedIds([])
      toast.success('Notifications marked as unread')
    },
    onError: () => toast.error('Failed to mark as unread'),
  })

  const saveSettingsMutation = useMutation({
    mutationFn: updateNotificationSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-settings'] })
      setSettingsPatch({})
      toast.success('Notification settings saved')
    },
    onError: () => toast.error('Failed to save settings'),
  })

  const handleMarkRead = useCallback(
    (id?: string) => {
      const ids = id ? [id] : selectedIds.length ? selectedIds : undefined
      markReadMutation.mutate(ids)
      if (!id) setSelectedIds([])
    },
    [selectedIds, markReadMutation]
  )

  const handleMarkUnread = useCallback(
    (id?: string) => {
      const ids = id ? [id] : selectedIds
      if (ids.length) markUnreadMutation.mutate(ids)
    },
    [selectedIds, markUnreadMutation]
  )

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const handleClearFilters = useCallback(() => {
    setTypeFilter('')
    setReadStatusFilter('all')
  }, [])

  const mergedSettings: NotificationSettings | null = settings
    ? {
        ...settings,
        ...settingsPatch,
        defaultFrequency: (settingsPatch.defaultFrequency ?? settings.defaultFrequency) as NotificationFrequency,
      }
    : null

  const handleSaveSettings = useCallback(() => {
    if (!mergedSettings) return
    saveSettingsMutation.mutate({
      inAppEnabled: mergedSettings.inAppEnabled,
      emailEnabled: mergedSettings.emailEnabled,
      defaultFrequency: mergedSettings.defaultFrequency,
      perProjectSettings: mergedSettings.perProjectSettings,
    })
  }, [mergedSettings, saveSettingsMutation])

  const notifications = notificationsData?.items ?? []
  const hasActiveFilters = !!typeFilter || readStatusFilter !== 'all'

  return (
    <div className="animate-in space-y-8">
      <div>
        <h1 className="text-[28px] font-semibold tracking-tight flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" />
          Notifications Center
        </h1>
        <p className="mt-1 text-muted-foreground">
          Manage your notification feed, settings, and reminder templates
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-4 xl:col-span-3 space-y-6 order-2 lg:order-1">
          <SettingsPanel
            settings={mergedSettings}
            isLoading={settingsLoading}
            isSaving={saveSettingsMutation.isPending}
            onUpdate={(patch) => setSettingsPatch((prev) => ({ ...prev, ...patch }))}
            onSave={handleSaveSettings}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          <QuickActionsDock />
        </aside>

        <main className="lg:col-span-8 xl:col-span-9 space-y-6 order-1 lg:order-2">
          <FiltersBar
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            readStatusFilter={readStatusFilter}
            onReadStatusFilterChange={setReadStatusFilter}
            hasFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          />

          <BulkActionsBar
            selectedIds={selectedIds}
            onMarkRead={() => handleMarkRead()}
            onMarkUnread={() => handleMarkUnread()}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
            isLoading={markReadMutation.isPending || markUnreadMutation.isPending}
          />

          <FeedList
            notifications={notifications}
            isLoading={isLoading}
            selectedIds={selectedIds}
            onSelect={handleSelect}
            onMarkRead={handleMarkRead}
            onMarkUnread={handleMarkUnread}
            showCheckbox
          />
        </main>
      </div>
    </div>
  )
}
