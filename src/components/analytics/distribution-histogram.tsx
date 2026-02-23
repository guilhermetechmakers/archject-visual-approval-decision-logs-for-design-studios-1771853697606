import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface DistributionBucket {
  bucket: string
  count: number
  minSeconds?: number
  maxSeconds?: number
  bucketStart?: number
  bucketEnd?: number
}

interface DistributionHistogramProps {
  data: DistributionBucket[]
  selectedBucket?: string
  onBucketSelect?: (bucket: string) => void
  className?: string
}

const ACCENT_COLOR = 'rgb(var(--primary))'
const MUTED_COLOR = 'rgb(var(--muted-foreground) / 0.3)'

export function DistributionHistogram({
  data,
  selectedBucket,
  onBucketSelect,
  className,
}: DistributionHistogramProps) {
  const chartData = data.map((d) => ({
    name: d.bucket,
    count: d.count,
    fullLabel: d.bucket,
  }))

  return (
    <Card className={cn('rounded-xl', className)}>
      <CardHeader>
        <CardTitle>Approval Time Distribution</CardTitle>
        <p className="text-sm text-muted-foreground">
          Histogram of decision approval times. Click a bar to filter the slow decisions table.
        </p>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div
            className="flex h-64 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"
            role="img"
            aria-label="No distribution data available"
          >
            No data for selected period
          </div>
        ) : (
          <div className="h-64" role="img" aria-label="Approval time distribution histogram">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'rgb(var(--muted-foreground))' }}
                  stroke="rgb(var(--muted-foreground))"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'rgb(var(--muted-foreground))' }}
                  stroke="rgb(var(--muted-foreground))"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgb(var(--card))',
                    border: '1px solid rgb(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  formatter={(value: number) => [`${value} decisions`, 'Count']}
                  labelFormatter={(label) => `Bucket: ${label}`}
                />
                <Bar
                  dataKey="count"
                  radius={[4, 4, 0, 0]}
                  onClick={(entry) => onBucketSelect?.(entry.name)}
                  cursor={onBucketSelect ? 'pointer' : 'default'}
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={entry.name === selectedBucket ? ACCENT_COLOR : MUTED_COLOR}
                      className="transition-colors duration-200"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
