import type { LucideIcon } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface MetricsSnapshotCardProps {
  metricLabel: string
  value: string | number
  delta?: string | null
  deltaDirection?: 'up' | 'down' | 'neutral'
  statusColor?: 'success' | 'warning' | 'error' | 'neutral'
  icon: LucideIcon
  className?: string
}

export function MetricsSnapshotCard({
  metricLabel,
  value,
  delta,
  deltaDirection = 'neutral',
  statusColor = 'neutral',
  icon: Icon,
  className,
}: MetricsSnapshotCardProps) {
  const statusClasses = {
    success: 'text-success',
    warning: 'text-warning',
    error: 'text-destructive',
    neutral: 'text-muted-foreground',
  }
  const deltaClasses = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  }

  return (
    <Card
      className={cn(
        'card-hover overflow-hidden transition-all duration-200 hover:shadow-card-hover',
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {metricLabel}
        </CardTitle>
        <div className={cn('rounded-lg p-2', statusClasses[statusColor])}>
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {delta != null && (
          <p className={cn('mt-1 text-xs', deltaClasses[deltaDirection])}>
            {delta}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
