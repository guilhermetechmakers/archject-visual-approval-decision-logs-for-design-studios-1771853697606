import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface AuditEntry {
  id: string
  action: string
  performedBy?: string
  performedAt?: string
  performed_at?: string
  details?: string
}

export interface AuditTrailViewProps {
  entries: AuditEntry[]
  className?: string
}

export function AuditTrailView({ entries, className }: AuditTrailViewProps) {
  const actionLabels: Record<string, string> = {
    created: 'Decision created',
    updated: 'Decision updated',
    published: 'Decision published',
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">Audit trail</CardTitle>
        <p className="text-sm text-muted-foreground">Action history for this decision</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet</p>
          ) : (
            entries.map((e) => {
              const ts = e.performedAt ?? e.performed_at
              return (
                <div key={e.id} className="flex gap-3">
                  <div
                    className={cn(
                      'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                      e.action === 'published' ? 'bg-success' : 'bg-primary'
                    )}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {actionLabels[e.action] ?? e.action}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ts ? new Date(ts).toLocaleString() : ''}
                      {e.performedBy && ` by ${e.performedBy}`}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}
