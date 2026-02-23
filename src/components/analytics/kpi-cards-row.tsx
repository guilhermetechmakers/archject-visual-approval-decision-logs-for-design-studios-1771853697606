import { TrendingUp, TrendingDown, Clock, Percent, FileCheck, MessageSquare } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { AnalyticsKPIs, AnalyticsTrend } from '@/api/analytics'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`
  return `${(seconds / 86400).toFixed(1)}d`
}

interface KPICardProps {
  title: string
  value: string | number
  trend?: 'up' | 'down'
  trendValue?: string
  icon: React.ComponentType<{ className?: string }>
  onClick?: () => void
  accent?: boolean
}

function KPICard({ title, value, trend, trendValue, icon: Icon, onClick, accent }: KPICardProps) {
  return (
    <Card
      role={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:shadow-card-hover',
        onClick && 'cursor-pointer hover:-translate-y-0.5',
        accent && 'border-primary/30'
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <Icon className={cn('h-5 w-5', accent ? 'text-primary' : 'text-muted-foreground')} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold', accent && 'text-primary')}>{value}</span>
          {trend && trendValue && (
            <span
              className={cn(
                'flex items-center text-xs font-medium',
                trend === 'up' ? 'text-success' : 'text-destructive'
              )}
            >
              {trend === 'up' ? <TrendingUp className="mr-0.5 h-3 w-3" /> : <TrendingDown className="mr-0.5 h-3 w-3" />}
              {trendValue}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface KPICardsRowProps {
  kpis: AnalyticsKPIs
  trend?: AnalyticsTrend
  slaOverlay?: boolean
  onKpiClick?: (kpi: string) => void
}

export function KPICardsRow({ kpis, trend, onKpiClick }: KPICardsRowProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" role="region" aria-label="Key performance indicators">
      <KPICard
        title="Median approval time"
        value={formatDuration(kpis.medianApprovalSeconds)}
        trend={trend && trend.medianApprovalSeconds < kpis.medianApprovalSeconds ? 'down' : 'up'}
        trendValue={trend ? `vs prev: ${formatDuration(trend.medianApprovalSeconds)}` : undefined}
        icon={Clock}
        onClick={() => onKpiClick?.('median')}
        accent
      />
      <KPICard
        title="Within SLA"
        value={`${kpis.pctWithinSla.toFixed(1)}%`}
        trend={trend && trend.pctWithinSla > kpis.pctWithinSla ? 'up' : 'down'}
        trendValue={trend ? `vs prev: ${trend.pctWithinSla.toFixed(1)}%` : undefined}
        icon={Percent}
        onClick={() => onKpiClick?.('sla')}
      />
      <KPICard
        title="Total decisions"
        value={kpis.totalDecisions}
        icon={FileCheck}
        onClick={() => onKpiClick?.('total')}
      />
      <KPICard
        title="Avg response time"
        value={formatDuration(kpis.avgResponseSeconds)}
        icon={MessageSquare}
        onClick={() => onKpiClick?.('response')}
      />
    </div>
  )
}
