import { Smartphone, Mail, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { InAppSettings } from './in-app-settings'
import { EmailSettings } from './email-settings'
import { TemplatesEditor } from './templates-editor'
import { cn } from '@/lib/utils'
import type { NotificationSettings, NotificationFrequency } from '@/types'

export interface SettingsPanelProps {
  settings: NotificationSettings | null
  isLoading?: boolean
  isSaving?: boolean
  onUpdate: (patch: Partial<{
    inAppEnabled: boolean
    emailEnabled: boolean
    defaultFrequency: NotificationFrequency
    perProjectSettings: NotificationSettings['perProjectSettings']
  }>) => void
  onSave: () => void
  activeTab?: 'in-app' | 'email' | 'templates'
  onTabChange?: (tab: 'in-app' | 'email' | 'templates') => void
  className?: string
}

export function SettingsPanel({
  settings,
  isLoading,
  isSaving,
  onUpdate,
  onSave,
  activeTab = 'in-app',
  onTabChange,
  className,
}: SettingsPanelProps) {
  if (isLoading || !settings) {
    return (
      <Card className={cn('animate-pulse', className)}>
        <CardHeader>
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-4 w-48 bg-muted rounded mt-2" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const tabs = [
    { id: 'in-app' as const, label: 'In-App', icon: Smartphone },
    { id: 'email' as const, label: 'Email', icon: Mail },
    { id: 'templates' as const, label: 'Templates', icon: FileText },
  ]

  return (
    <Card className={cn('card-hover', className)}>
      <CardHeader>
        <CardTitle>Notification Settings</CardTitle>
        <CardDescription>
          Configure how and when you receive notifications
        </CardDescription>
        {onTabChange && (
          <div className="flex gap-1 rounded-lg border border-border p-1 mt-4" role="tablist">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {activeTab === 'in-app' && (
          <InAppSettings
            inAppEnabled={settings.inAppEnabled}
            defaultFrequency={settings.defaultFrequency}
            perProjectSettings={settings.perProjectSettings}
            onUpdate={onUpdate}
          />
        )}
        {activeTab === 'email' && (
          <EmailSettings
            emailEnabled={settings.emailEnabled}
            defaultFrequency={settings.defaultFrequency}
            perProjectSettings={settings.perProjectSettings}
            onUpdate={onUpdate}
          />
        )}
        {activeTab === 'templates' && <TemplatesEditor />}
        {activeTab !== 'templates' && (
          <Button onClick={onSave} disabled={isSaving} className="w-full">
            {isSaving ? 'Saving...' : 'Save settings'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
