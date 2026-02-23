import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, type SelectOption } from '@/components/ui/select'
import type { NotificationSettings, NotificationFrequency } from '@/types'

const FREQUENCY_OPTIONS: SelectOption[] = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'daily_digest', label: 'Daily digest' },
  { value: 'weekly_digest', label: 'Weekly digest' },
]

export interface EmailSettingsProps {
  emailEnabled: boolean
  defaultFrequency: NotificationFrequency
  perProjectSettings: NotificationSettings['perProjectSettings']
  onUpdate: (patch: Partial<{
    emailEnabled: boolean
    defaultFrequency: NotificationFrequency
    perProjectSettings: NotificationSettings['perProjectSettings']
  }>) => void
}

export function EmailSettings({
  emailEnabled,
  defaultFrequency,
  perProjectSettings,
  onUpdate,
}: EmailSettingsProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Label htmlFor="email-enabled" className="text-base font-medium">
            Email notifications
          </Label>
          <p className="text-sm text-muted-foreground mt-0.5">
            Receive notifications via email
          </p>
        </div>
        <Switch
          id="email-enabled"
          checked={emailEnabled}
          onCheckedChange={(checked) => onUpdate({ emailEnabled: checked })}
          aria-label="Enable email notifications"
        />
      </div>
      {emailEnabled && (
        <div className="space-y-2">
          <Label htmlFor="email-frequency">Frequency</Label>
          <Select
            id="email-frequency"
            value={defaultFrequency}
            onValueChange={(v) => onUpdate({ defaultFrequency: v as NotificationFrequency })}
            options={FREQUENCY_OPTIONS}
            placeholder="Select frequency"
            aria-label="Email frequency"
          />
        </div>
      )}
      {perProjectSettings.length > 0 && (
        <div className="space-y-3">
          <Label className="text-base">Per-project overrides</Label>
          <div className="space-y-2 rounded-lg border border-border p-3">
            {perProjectSettings.map((p) => (
              <div
                key={p.projectId}
                className="flex items-center justify-between py-2 border-b border-border last:border-0"
              >
                <span className="text-sm font-medium">
                  {p.projectName ?? p.projectId}
                </span>
                <Switch
                  checked={p.emailEnabled}
                  onCheckedChange={(checked) => {
                    const updated = perProjectSettings.map((s) =>
                      s.projectId === p.projectId
                        ? { ...s, emailEnabled: checked }
                        : s
                    )
                    onUpdate({ perProjectSettings: updated })
                  }}
                  aria-label={`Email for ${p.projectName ?? p.projectId}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
