import { useState } from 'react'
import { Plug, Plus, Webhook } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

const INTEGRATIONS = [
  { id: 'slack', name: 'Slack', description: 'Get notifications in Slack', icon: 'S', comingSoon: true },
  { id: 'figma', name: 'Figma', description: 'Import designs from Figma', icon: 'F', comingSoon: true },
  { id: 'dropbox', name: 'Dropbox', description: 'Sync files from Dropbox', icon: 'D', comingSoon: true },
  { id: 'google_drive', name: 'Google Drive', description: 'Connect Google Drive', icon: 'G', comingSoon: true },
]

export function IntegrationsPanel() {
  const [webhookModalOpen, setWebhookModalOpen] = useState(false)
  const [webhookUrl, setWebhookUrl] = useState('')

  const handleAddWebhook = () => {
    if (!webhookUrl.trim()) return
    toast.info('Webhook configuration coming soon. Your URL has been noted.')
    setWebhookModalOpen(false)
    setWebhookUrl('')
  }

  return (
    <>
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plug className="h-5 w-5" />
            Integrations
          </CardTitle>
          <CardDescription>
            Connect external tools and services. More integrations coming soon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {INTEGRATIONS.map((int) => (
            <div
              key={int.id}
              className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted font-medium">
                  {int.icon}
                </div>
                <div>
                  <p className="font-medium">{int.name}</p>
                  <p className="text-sm text-muted-foreground">{int.description}</p>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled>
                {int.comingSoon ? 'Coming soon' : 'Connect'}
              </Button>
            </div>
          ))}
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
          <Button onClick={() => setWebhookModalOpen(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add webhook
          </Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Webhooks are configured per project. Add endpoints to receive real-time updates. Full webhook API coming soon.
          </p>
        </CardContent>
      </Card>

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
                className="mt-2"
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
