import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface MetricCardProps {
  title: string
  value: string | number
  trend?: 'up' | 'down' | null
  trendLabel?: string
  icon: LucideIcon
  linkTo?: string
  sparklineData?: { value: number }[]
  className?: string
}

export function MetricCard({
  title,
  value,
  trend,
  trendLabel,
  icon: Icon,
  linkTo,
  sparklineData = [],
  className,
}: MetricCardProps) {
  const data = sparklineData.length > 0 ? sparklineData : Array.from({ length: 7 }, () => ({ value: 10 + Math.random() * 20 }))

  return (
    <Link to={linkTo ?? '#'} className={cn('block', !linkTo && 'pointer-events-none', className)}>
      <Card className="card-hover overflow-hidden transition-all duration-200 hover:shadow-card-hover">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-2xl font-bold">{value}</div>
            {trend && (
              <span
                className={cn(
                  'text-xs font-medium',
                  trend === 'up' && 'text-success',
                  trend === 'down' && 'text-destructive'
                )}
              >
                {trend === 'up' ? '↑' : '↓'} {trendLabel ?? 'vs last period'}
              </span>
            )}
          </div>
          {data.length > 0 && (
            <div className="mt-4 h-12 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                  <Tooltip
                    contentStyle={{ fontSize: 12, border: 'none', borderRadius: 8 }}
                    formatter={(v: number) => [v.toFixed(1), '']}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="rgb(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
