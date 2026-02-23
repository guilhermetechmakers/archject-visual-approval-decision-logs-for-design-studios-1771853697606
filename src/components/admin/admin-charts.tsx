import { useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { adminApi } from '@/api/admin'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

const RANGE_OPTIONS = [7, 30, 90] as const

export function AdminCharts() {
  const [range, setRange] = useState<number>(30)
  const [metric, setMetric] = useState<'approvals' | 'sessions' | 'error_rate'>('approvals')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'metrics-series', metric, range],
    queryFn: () => adminApi.getMetricsSeries(metric, range),
  })

  const series = data?.series ?? []
  const chartData = series.map((s: { date: string; value: number }) => ({ ...s, name: s.date.slice(5) }))

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <CardTitle>Usage & Performance</CardTitle>
        <div className="flex flex-wrap gap-2">
          {RANGE_OPTIONS.map((r) => (
            <Button
              key={r}
              variant={range === r ? 'default' : 'outline'}
              size="sm"
              onClick={() => setRange(r)}
            >
              {r}d
            </Button>
          ))}
          <select
            value={metric}
            onChange={(e) => setMetric(e.target.value as typeof metric)}
            className={cn(
              'rounded-lg border border-input bg-background px-3 py-1.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
            aria-label="Metric"
          >
            <option value="approvals">Approvals</option>
            <option value="sessions">Sessions</option>
            <option value="error_rate">Error rate</option>
          </select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[280px] w-full" />
        ) : chartData.length === 0 ? (
          <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
            No data for selected range
          </div>
        ) : (
          <div className="h-[280px]" role="img" aria-label={`${metric} over last ${range} days`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="rgb(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="rgb(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(var(--card))',
                    border: '1px solid rgb(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => [value, metric.replace('_', ' ')]}
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
  )
}
