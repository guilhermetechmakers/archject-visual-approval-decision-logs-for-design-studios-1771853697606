import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plug,
  Calendar,
  Box,
  Webhook,
  Plus,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { getIntegrations, updateIntegration } from '@/api/settings'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const DRIVE_PROVIDERS = [
  { id: 'google_drive', name: 'Google Drive', icon: 'G', description: 'Sync files from Google Drive' },
  { id: 'dropbox', name: 'Dropbox', icon: 'D', description: 'Sync files from Dropbox' },
]

function DriveIntegrationCard({
  provider,
  enabled,
  isActiveProvider,
  onToggle,
  isPending,
}: {
  provider: { id: string; name: string; icon: string; description: string }
  enabled: boolean
  isActiveProvider: boolean
  onToggle: (enabled: boolean) => void
  isPending: boolean
}) {
  const isConnected = enabled && isActiveProvider
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border border-border p-4 transition-all duration-200',
        isConnected && 'border-primary/30 bg-primary/5'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted font-semibold">
          {provider.icon}
        </div>
        <div>
          <p className="font-medium">{provider.name}</p>
          <p className="text-sm text-muted-foreground">{provider.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch
          checked={isConnected}
          onCheckedChange={onToggle}
          disabled={isPending}
        />
        <span className="text-sm text-muted-foreground">
          {isConnected ? 'Connected' : 'Connect'}
        </span>
      </div>
    </div>
  )
}

function CalendarIntegrationCard({
  enabled,
  onToggle,
  isPending,
}: {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  isPending: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border border-border p-4 transition-all duration-200',
        enabled && 'border-primary/30 bg-primary/5'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Calendar className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Google Calendar</p>
          <p className="text-sm text-muted-foreground">
            Sync scheduling and deadlines with Google Calendar
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={isPending} />
        <Button variant="outline" size="sm" disabled>
          {enabled ? 'Connected' : 'Connect'}
        </Button>
      </div>
    </div>
  )
}

function BIMIntegrationCard({
  enabled,
  onToggle,
  isPending,
}: {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  isPending: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-xl border border-border p-4 transition-all duration-200',
        enabled && 'border-primary/30 bg-primary/5'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
          <Box className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-medium">Autodesk Forge BIM</p>
          <p className="text-sm text-muted-foreground">
            BIM model previews and asset linkage
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={enabled} onCheckedChange={onToggle} disabled={isPending} />
        <Button variant="outline" size="sm" disabled>
          {enabled ? 'Connected' : 'Connect'}
        </Button>
      </div>
    </div>
  )
}

export function IntegrationsPanel() {
  const queryClient = useQueryClient()
  const [webhookModalOpen, setWebhookModalOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  const { data: integrations, isLoading } = useQuery({
    queryKey: ['settings', 'integrations', 'default'],
    queryFn: () => getIntegrations('default'),
  })

  const updateMutation = useMutation({
    mutationFn: ({
      provider,
      data,
    }: {
      provider: 'drive' | 'calendar' | 'bimForge'
      data: Record<string, unknown>
    }) => updateIntegration('default', provider, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'integrations', 'default'] })
      toast.success('Integration updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleDriveToggle = (enabled: boolean, providerId?: string) => {
    updateMutation.mutate({
      provider: 'drive',
      data: {
        enabled,
        provider: providerId ?? integrations?.drive?.provider ?? 'google_drive',
      },
    })
  }

  const handleCalendarToggle = (enabled: boolean) => {
    updateMutation.mutate({
      provider: 'calendar',
      data: { enabled },
    })
  }

  const handleBIMToggle = (enabled: boolean) => {
    updateMutation.mutate({
      provider: 'bimForge',
      data: { enabled },
    })
  }

  const handleAddWebhook = () => {
    if (!webhookUrl.trim()) return
    toast.info('Webhook configuration coming soon. Your URL has been noted.')
    setWebhookModalOpen(false)
    setWebhookUrl('')
  }

  if (isLoading || !integrations) {
    return (
      <Card className="card-hover">
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plug className="h-5 w-5 text-muted-foreground" />
              Integrations
            </CardTitle>
            <CardDescription>
              Connect Google Drive, Dropbox, Calendar, and Autodesk Forge BIM. More integrations coming soon.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">File storage</p>
              <div className="space-y-3">
                {DRIVE_PROVIDERS.map((provider) => (
                  <DriveIntegrationCard
                    key={provider.id}
                    provider={provider}
                    enabled={integrations?.drive.enabled ?? false}
                    isActiveProvider={integrations?.drive.provider === provider.id}
                    onToggle={(enabled) => {
                      if (enabled && integrations?.drive.provider !== provider.id) {
                        handleDriveToggle(true, provider.id)
                      } else {
                        handleDriveToggle(enabled)
                      }
                    }}
                    isPending={updateMutation.isPending}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Calendar</p>
              <CalendarIntegrationCard
                enabled={integrations.calendar.enabled}
                onToggle={handleCalendarToggle}
                isPending={updateMutation.isPending}
              />
            </div>

            <div>
              <p className="text-sm font-medium mb-2">BIM preview</p>
              <BIMIntegrationCard
                enabled={integrations.bimForge.enabled}
                onToggle={handleBIMToggle}
                isPending={updateMutation.isPending}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="h-5 w-5" />
                Webhooks
              </CardTitle>
              <CardDescription>
                Receive events when decisions are approved or actions occur
              </CardDescription>
            </div>
            <Button onClick={() => setWebhookModalOpen(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Add webhook
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Webhooks are configured per project. Add endpoints to receive real-time updates. Full webhook API coming soon.
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={webhookModalOpen} onOpenChange={setWebhookModalOpen}>
        <DialogContent onClose={() => setWebhookModalOpen(false)} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add webhook</DialogTitle>
            <DialogDescription>
              Enter the URL to receive webhook events. We will send POST requests with event payloads.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="webhook-url">URL</Label>
              <Input
                id="webhook-url"
                type="url"
                placeholder="https://your-server.com/webhooks"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="mt-2 rounded-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWebhookModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddWebhook} disabled={!webhookUrl.trim()}>
              Add webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
