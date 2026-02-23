import { Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { RecipientDraft, ReminderDraft } from '@/api/decisions-create'

const REMINDER_PRESETS: { label: string; schedule: string }[] = [
  { label: '3 days before', schedule: '3_days_before' },
  { label: '1 day before', schedule: '1_day_before' },
  { label: 'Day of deadline', schedule: '0_days_before' },
]

export interface SettingsPanelProps {
  approvalDeadline: string
  reminders: ReminderDraft[]
  clientMustTypeNameToConfirm: boolean
  recipients: RecipientDraft[]
  onApprovalDeadlineChange: (v: string) => void
  onRemindersChange: (r: ReminderDraft[]) => void
  onClientMustTypeNameChange: (v: boolean) => void
  onRecipientsChange: (r: RecipientDraft[]) => void
  onContinue: () => void
  errors?: { field?: string; message: string }[]
}

export function SettingsPanel({
  approvalDeadline,
  reminders,
  clientMustTypeNameToConfirm,
  recipients,
  onApprovalDeadlineChange,
  onRemindersChange,
  onClientMustTypeNameChange,
  onRecipientsChange,
  onContinue,
  errors = [],
}: SettingsPanelProps) {
  const addReminder = (schedule: string) => {
    onRemindersChange([
      ...reminders,
      { type: 'email', schedule, message: `Reminder: decision due ${schedule.replace('_', ' ')}` },
    ])
  }

  const removeReminder = (index: number) => {
    onRemindersChange(reminders.filter((_, i) => i !== index))
  }

  const addRecipient = () => {
    onRecipientsChange([...recipients, { contactEmail: '', role: 'client' }])
  }

  const updateRecipient = (index: number, updates: Partial<RecipientDraft>) => {
    const next = [...recipients]
    next[index] = { ...next[index], ...updates }
    onRecipientsChange(next)
  }

  const removeRecipient = (index: number) => {
    onRecipientsChange(recipients.filter((_, i) => i !== index))
  }

  const recipientErrors = errors.filter((e) => e.field === 'recipients')
  const hasRecipientError = recipientErrors.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold">Settings</h2>
        <p className="mt-1 text-muted-foreground">
          Configure approval deadline, reminders, and client recipients
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval deadline</CardTitle>
          <CardDescription>When should the client respond by?</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            type="datetime-local"
            value={approvalDeadline}
            onChange={(e) => onApprovalDeadlineChange(e.target.value)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reminders</CardTitle>
          <CardDescription>Send reminders before the deadline</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {REMINDER_PRESETS.map((p) => (
              <Button
                key={p.schedule}
                variant="outline"
                size="sm"
                onClick={() => addReminder(p.schedule)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {p.label}
              </Button>
            ))}
          </div>
          {reminders.length > 0 && (
            <ul className="space-y-2">
              {reminders.map((r, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-border px-3 py-2"
                >
                  <span className="text-sm">{r.schedule.replace(/_/g, ' ')}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeReminder(i)}
                    aria-label="Remove reminder"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client confirmation</CardTitle>
          <CardDescription>Require client to type their name when approving</CardDescription>
        </CardHeader>
        <CardContent>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={clientMustTypeNameToConfirm}
              onCheckedChange={(c) => onClientMustTypeNameChange(!!c)}
            />
            <span className="text-sm">Client must type name to confirm</span>
          </label>
        </CardContent>
      </Card>

      <Card className={cn(hasRecipientError && 'border-destructive')}>
        <CardHeader>
          <CardTitle className="text-base">Client recipients</CardTitle>
          <CardDescription>Who will receive the decision link? Add at least one for publishing.</CardDescription>
          {hasRecipientError && (
            <p className="text-sm text-destructive">{recipientErrors[0]?.message}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {recipients.map((r, i) => (
            <div key={i} className="flex gap-2">
              <Input
                type="email"
                placeholder="client@example.com"
                value={r.contactEmail}
                onChange={(e) => updateRecipient(i, { contactEmail: e.target.value })}
                className="flex-1"
              />
              <Select
                options={[
                  { value: 'client', label: 'Client' },
                  { value: 'observer', label: 'Observer' },
                ]}
                value={r.role}
                onValueChange={(v) => updateRecipient(i, { role: v as 'client' | 'observer' })}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeRecipient(i)}
                aria-label="Remove recipient"
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addRecipient}>
            <Plus className="mr-2 h-4 w-4" />
            Add recipient
          </Button>
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={onContinue}>Continue to preview</Button>
      </div>
    </div>
  )
}
