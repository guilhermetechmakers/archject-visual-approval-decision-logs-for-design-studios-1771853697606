import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  in_review: 'In Review',
  re_requested: 'Re-requested',
  approved: 'Approved',
  declined: 'Declined',
}

interface BottleneckHeatmapProps {
  heatmap: Record<string, Record<string, number>>
  onCellClick?: (status: string, bucket: string) => void
  className?: string
}

export function BottleneckHeatmap({ heatmap, onCellClick, className }: BottleneckHeatmapProps) {
  const [hovered, setHovered] = useState<{ status: string; bucket: string } | null>(null)

  const { statuses, buckets, maxCount } = useMemo(() => {
    const statuses = Object.keys(heatmap).filter((s) => Object.keys(heatmap[s] || {}).length > 0)
    const allBuckets = new Set<string>()
    statuses.forEach((s) => Object.keys(heatmap[s] || {}).forEach((b) => allBuckets.add(b)))
    const buckets = Array.from(allBuckets).sort()
    let maxCount = 0
    statuses.forEach((s) => {
      Object.values(heatmap[s] || {}).forEach((c) => {
        if (c > maxCount) maxCount = c
      })
    })
    return { statuses, buckets, maxCount: maxCount || 1 }
  }, [heatmap])

  const getColor = (count: number) => {
    if (count === 0) return 'rgb(var(--muted) / 0.3)'
    const intensity = Math.min(1, count / maxCount)
    const r = 0
    const g = 82
    const b = 204
    return `rgba(${r}, ${g}, ${b}, ${0.2 + intensity * 0.8})`
  }

  if (statuses.length === 0 || buckets.length === 0) {
    return (
      <Card className={cn('rounded-xl', className)}>
        <CardHeader>
          <CardTitle>Bottleneck Heatmap</CardTitle>
          <p className="text-sm text-muted-foreground">Decisions by status vs time</p>
        </CardHeader>
        <CardContent>
          <div
            className="flex h-48 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"
            role="img"
            aria-label="No heatmap data available"
          >
            No data for selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('rounded-xl', className)}>
      <CardHeader>
        <CardTitle>Bottleneck Heatmap</CardTitle>
        <p className="text-sm text-muted-foreground">
          Decisions by status vs time bucket. Hover for counts, click to filter table.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="inline-grid gap-1"
            style={{
              gridTemplateColumns: `120px repeat(${buckets.length}, minmax(48px, 1fr))`,
              gridTemplateRows: `repeat(${statuses.length + 1}, 32px)`,
            }}
            role="img"
            aria-label="Bottleneck heatmap showing decision counts by status and time period"
          >
            <div className="col-span-1" />
            {buckets.map((b) => (
              <div
                key={b}
                className="flex items-center justify-center truncate px-1 text-xs text-muted-foreground"
              >
                {b.slice(5)}
              </div>
            ))}
            {statuses.map((status) => (
              <React.Fragment key={status}>
                <div className="flex items-center text-sm font-medium">
                  {STATUS_LABELS[status] || status}
                </div>
                {buckets.map((bucket) => {
                  const count = heatmap[status]?.[bucket] ?? 0
                  const isHovered = hovered?.status === status && hovered?.bucket === bucket
                  return (
                    <div
                      key={`${status}-${bucket}`}
                      className={cn(
                        'flex cursor-pointer items-center justify-center rounded transition-all duration-200',
                        isHovered && 'ring-2 ring-primary ring-offset-2'
                      )}
                      style={{ backgroundColor: getColor(count) }}
                      onMouseEnter={() => setHovered({ status, bucket })}
                      onMouseLeave={() => setHovered(null)}
                      onClick={() => onCellClick?.(status, bucket)}
                      role="gridcell"
                      aria-label={`${STATUS_LABELS[status] || status} ${bucket}: ${count} decisions`}
                    >
                      {count > 0 && <span className="text-xs font-medium">{count}</span>}
                    </div>
                  )
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
        {hovered && (
          <div className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <strong>{STATUS_LABELS[hovered.status] || hovered.status}</strong> • {hovered.bucket}:{' '}
            {heatmap[hovered.status]?.[hovered.bucket] ?? 0} decisions
          </div>
        )}
      </CardContent>
    </Card>
  )
}
