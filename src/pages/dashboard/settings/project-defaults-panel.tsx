import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Settings2, Bell } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { api } from '@/lib/api'
import { Select } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

const REMINDER_OPTIONS = [
  { value: 'immediately', label: 'Immediately' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
]

const EXPORT_FORMATS = [
  { id: 'pdf', label: 'PDF' },
  { id: 'csv', label: 'CSV' },
  { id: 'json', label: 'JSON' },
]

const schema = z.object({
  reminderCadence: z.enum(['immediately', 'daily', 'weekly']),
  autoNotification: z.boolean(),
  exportFormats: z.array(z.string()),
})

type FormData = z.infer<typeof schema>

const DEFAULT_DEFAULTS: FormData = {
  reminderCadence: 'immediately',
  autoNotification: true,
  exportFormats: ['pdf', 'csv'],
}

async function getProjectDefaults(): Promise<FormData> {
  try {
    const data = await api.get<{
      reminderCadence: string
      autoNotification: boolean
      exportFormats: string[]
    }>('/studios/default/defaults')
    return {
      reminderCadence: (data?.reminderCadence as FormData['reminderCadence']) ?? 'immediately',
      autoNotification: data?.autoNotification ?? true,
      exportFormats: data?.exportFormats ?? ['pdf', 'csv'],
    }
  } catch {
    return DEFAULT_DEFAULTS
  }
}

async function updateProjectDefaults(data: FormData): Promise<FormData> {
  return api.put<FormData>('/studios/default/defaults', data)
}

export function ProjectDefaultsPanel() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['studio', 'default', 'defaults'],
    queryFn: getProjectDefaults,
    placeholderData: DEFAULT_DEFAULTS,
  })

  const mutation = useMutation({
    mutationFn: updateProjectDefaults,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', 'default', 'defaults'] })
      toast.success('Project defaults saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    values: data,
    defaultValues: DEFAULT_DEFAULTS,
  })

  const onSubmit = form.handleSubmit((d) => mutation.mutate(d))

  const toggleExportFormat = (id: string) => {
    const current = form.getValues('exportFormats')
    const next = current.includes(id)
      ? current.filter((f) => f !== id)
      : [...current, id]
    form.setValue('exportFormats', next)
  }

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings2 className="h-5 w-5" />
          Project defaults
        </CardTitle>
        <CardDescription>
          Default reminder cadence, export formats, and notification settings for new projects
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-32 animate-pulse rounded-lg bg-muted" />
        ) : (
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Reminder cadence</Label>
              <Select
                options={REMINDER_OPTIONS}
                value={form.watch('reminderCadence')}
                onValueChange={(v) => form.setValue('reminderCadence', v as FormData['reminderCadence'])}
              />
              <p className="text-xs text-muted-foreground">
                How often to send reminders for pending client decisions
              </p>
            </div>

            <div className="space-y-2">
              <Label>Default export formats</Label>
              <div className="flex flex-wrap gap-4">
                {EXPORT_FORMATS.map((f) => (
                  <div key={f.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`export-${f.id}`}
                      checked={form.watch('exportFormats').includes(f.id)}
                      onCheckedChange={() => toggleExportFormat(f.id)}
                    />
                    <Label htmlFor={`export-${f.id}`} className="cursor-pointer font-normal">
                      {f.label}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Formats available when exporting decision logs
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Auto-notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically notify clients when decisions are ready for review
                  </p>
                </div>
              </div>
              <Switch
                checked={form.watch('autoNotification')}
                onCheckedChange={(v) => form.setValue('autoNotification', v)}
                aria-label="Enable auto-notifications"
              />
            </div>

            <Button type="submit" disabled={mutation.isPending} className="btn-hover">
              Save defaults
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
