import { Download, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ExportRecord } from '@/api/analytics'

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  done: 'success',
  queued: 'secondary',
  processing: 'warning',
  failed: 'destructive',
}

interface ExportHistoryListProps {
  exports: ExportRecord[]
  isLoading?: boolean
  onRefresh?: () => void
  onDownload?: (id: string) => void
  className?: string
}

export function ExportHistoryList({
  exports,
  isLoading,
  onRefresh,
  onDownload,
  className,
}: ExportHistoryListProps) {
  return (
    <Card className={cn('rounded-xl', className)}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Export History</CardTitle>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : exports.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <Download className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-2 font-medium">No exports yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Exports will appear here after you create a report
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {exports.slice(0, 10).map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  {exp.status === 'processing' || exp.status === 'queued' ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : exp.status === 'done' ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive" />
                  )}
                  <div>
                    <p className="text-sm font-medium">
                      {exp.scope?.projectId ? `Project ${exp.scope.projectId.slice(0, 8)}...` : 'Export'} • {exp.format.toUpperCase()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(exp.createdAt).toLocaleString()}
                      {exp.rowsCount != null && ` • ${exp.rowsCount} rows`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={STATUS_VARIANTS[exp.status] || 'secondary'}>
                    {exp.status}
                  </Badge>
                  {exp.status === 'done' && onDownload && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDownload(exp.id)}
                    >
                      <Download className="mr-1 h-4 w-4" />
                      Download
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
