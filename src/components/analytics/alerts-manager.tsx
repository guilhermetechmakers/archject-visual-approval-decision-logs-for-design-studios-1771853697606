import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Bell, Plus, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { analyticsApi, type Alert } from '@/api/analytics'

const schema = z.object({
  name: z.string().min(2, 'Name required'),
  scopeType: z.enum(['project', 'account']),
  scopeId: z.string().optional(),
  metric: z.string(),
  operator: z.enum(['>', '<', '>=', '<=']),
  thresholdValue: z.number().min(0),
  frequencyMinutes: z.number().min(5).max(10080),
  emailEnabled: z.boolean(),
  webhookUrl: z.string().url().optional().or(z.literal('')),
})

type FormValues = z.infer<typeof schema>

const METRIC_OPTIONS = [
  { value: 'median_approval_seconds', label: 'Median approval time (seconds)' },
  { value: 'pct_within_sla', label: 'Percent within SLA' },
  { value: 'pending_count', label: 'Pending count' },
]

interface AlertsManagerProps {
  alerts: Alert[]
  projectId?: string
  projects: { id: string; name: string }[]
  onRefresh: () => void
  className?: string
}

export function AlertsManager({
  alerts,
  projectId,
  projects,
  onRefresh,
  className,
}: AlertsManagerProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      scopeType: 'project',
      scopeId: projectId || '',
      metric: 'median_approval_seconds',
      operator: '>',
      thresholdValue: 72 * 3600,
      frequencyMinutes: 60,
      emailEnabled: true,
      webhookUrl: '',
    },
  })

  const scopeType = watch('scopeType')

  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }))

  const onSubmit = async (data: FormValues) => {
    try {
      if (editingId) {
        await analyticsApi.updateAlert(editingId, {
          name: data.name,
          scopeType: data.scopeType,
          scopeId: data.scopeId || undefined,
          metric: data.metric,
          operator: data.operator,
          thresholdValue: data.thresholdValue,
          frequencyMinutes: data.frequencyMinutes,
          channels: {
            email: data.emailEnabled ? ['user'] : [],
            webhook: data.webhookUrl ? [data.webhookUrl] : [],
          },
        })
        toast.success('Alert updated')
      } else {
        await analyticsApi.createAlert({
          name: data.name,
          scopeType: data.scopeType,
          scopeId: data.scopeId || projectId,
          metric: data.metric,
          operator: data.operator,
          thresholdValue: data.thresholdValue,
          frequencyMinutes: data.frequencyMinutes,
          channels: {
            email: data.emailEnabled ? ['user'] : [],
            webhook: data.webhookUrl ? [data.webhookUrl] : [],
          },
        })
        toast.success('Alert created')
      }
      setShowCreate(false)
      setEditingId(null)
      reset()
      onRefresh()
    } catch (e) {
      toast.error((e as { message?: string })?.message || 'Failed to save alert')
    }
  }

  const toggleEnabled = async (alert: Alert) => {
    try {
      await analyticsApi.updateAlert(alert.id, { enabled: !alert.enabled })
      toast.success(alert.enabled ? 'Alert disabled' : 'Alert enabled')
      onRefresh()
    } catch (e) {
      toast.error('Failed to update alert')
    }
  }

  const deleteAlert = async (id: string) => {
    try {
      await analyticsApi.deleteAlert(id)
      toast.success('Alert deleted')
      onRefresh()
    } catch (e) {
      toast.error('Failed to delete alert')
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Alerts & Thresholds
        </CardTitle>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New alert
        </Button>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Bell className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 font-medium">No alerts configured</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create an alert to get notified when metrics breach thresholds
            </p>
            <Button className="mt-4" size="sm" onClick={() => setShowCreate(true)}>
              Create alert
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{alert.name}</span>
                    <Badge variant={alert.enabled ? 'success' : 'secondary'}>
                      {alert.enabled ? 'Active' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {alert.metric} {alert.operator} {alert.thresholdValue}
                    {alert.lastTriggeredAt && (
                      <> • Last triggered: {new Date(alert.lastTriggeredAt).toLocaleString()}</>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEnabled(alert)}
                  >
                    {alert.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAlert(alert.id)}
                    aria-label="Delete alert"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showCreate || !!editingId}>
        <DialogContent onClose={() => { setShowCreate(false); setEditingId(null); reset(); }}>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Alert' : 'Create Alert'}</DialogTitle>
            <DialogDescription>
              Get notified when metrics breach your thresholds
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium">Name</label>
              <input
                {...register('name')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="e.g. Slow Finishes"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Scope</label>
              <select
                {...register('scopeType')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="project">Project</option>
                <option value="account">Account</option>
              </select>
            </div>
            {scopeType === 'project' && (
              <div>
                <label className="mb-1 block text-sm font-medium">Project</label>
                <select
                  {...register('scopeId')}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select project</option>
                  {projectOptions.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="mb-1 block text-sm font-medium">Metric</label>
              <select
                {...register('metric')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                {METRIC_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div>
                <label className="mb-1 block text-sm font-medium">Operator</label>
                <select
                  {...register('operator')}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value=">">&gt;</option>
                  <option value="<">&lt;</option>
                  <option value=">=">≥</option>
                  <option value="<=">≤</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Threshold</label>
                <input
                  type="number"
                  {...register('thresholdValue', { valueAsNumber: true })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Check frequency (minutes)</label>
              <input
                type="number"
                {...register('frequencyMinutes', { valueAsNumber: true })}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  {...register('emailEnabled')}
                  className="h-4 w-4 rounded border-input text-primary"
                />
                <span className="text-sm">Email notifications</span>
              </label>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Webhook URL (optional)</label>
              <input
                {...register('webhookUrl')}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                placeholder="https://..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowCreate(false); setEditingId(null); }}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {editingId ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
