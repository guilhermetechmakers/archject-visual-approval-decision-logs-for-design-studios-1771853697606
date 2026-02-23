import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { adminApi, type HealthService } from '@/api/admin'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

function StatusBadge({ status }: { status: HealthService['status'] }) {
  const config = {
    healthy: { icon: CheckCircle2, variant: 'success' as const, label: 'Healthy' },
    degraded: { icon: AlertTriangle, variant: 'warning' as const, label: 'Degraded' },
    unhealthy: { icon: XCircle, variant: 'destructive' as const, label: 'Unhealthy' },
  }
  const { icon: Icon, variant, label } = config[status]
  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  )
}

export function SystemHealthCard() {
  const queryClient = useQueryClient()
  const [logsOpen, setLogsOpen] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: () => adminApi.getHealth(),
  })

  const runCheck = useMutation({
    mutationFn: (service: string) => adminApi.runHealthCheck(service),
    onSuccess: (_, service) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'health'] })
      toast.success(`Health check completed for ${service}`)
    },
    onError: () => toast.error('Health check failed'),
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const services = data?.services ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>System Health</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLogsOpen(!logsOpen)}
          className="text-muted-foreground"
        >
          <FileText className="mr-2 h-4 w-4" />
          View logs
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {services.map((svc) => (
            <div
              key={svc.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border p-4"
            >
              <div>
                <p className="font-medium">{svc.name}</p>
                <p className="text-xs text-muted-foreground">
                  Last checked: {new Date(svc.lastChecked).toLocaleString()}
                </p>
                {svc.message && (
                  <p className="mt-1 text-xs text-warning">{svc.message}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={svc.status} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => runCheck.mutate(svc.id)}
                  disabled={runCheck.isPending}
                >
                  <RefreshCw className={cn('h-4 w-4', runCheck.isPending && 'animate-spin')} />
                </Button>
              </div>
            </div>
          ))}
        </div>
        {logsOpen && (
          <div className="mt-4 rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm text-muted-foreground">{'No recent logs available.'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
