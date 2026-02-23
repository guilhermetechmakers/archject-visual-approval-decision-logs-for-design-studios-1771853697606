import { Plug } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const integrations = [
  { id: 'slack', name: 'Slack', description: 'Get notifications in Slack', enabled: false },
  { id: 'figma', name: 'Figma', description: 'Import designs from Figma', enabled: true },
  { id: 'dropbox', name: 'Dropbox', description: 'Sync files from Dropbox', enabled: false },
]

export function IntegrationsPanel() {
  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-muted-foreground" />
          Integrations
        </CardTitle>
        <CardDescription>
          Connect external tools and services
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {integrations.map((int) => (
            <div
              key={int.id}
              className="flex items-center justify-between rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{int.name}</p>
                <p className="text-sm text-muted-foreground">{int.description}</p>
              </div>
              <Button variant={int.enabled ? 'outline' : 'default'} size="sm">
                {int.enabled ? 'Disable' : 'Enable'}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
