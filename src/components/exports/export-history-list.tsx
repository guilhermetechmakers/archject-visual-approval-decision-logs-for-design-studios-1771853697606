import { useQuery } from '@tanstack/react-query'
import { Download, FileText, FileSpreadsheet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { listExportHistory, downloadExport } from '@/api/exports-decision-logs'
import { cn } from '@/lib/utils'

export interface ExportHistoryListProps {
  projectId?: string
  limit?: number
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'ready' || status === 'processing'
      ? 'success'
      : status === 'processing' || status === 'queued'
        ? 'warning'
        : 'destructive'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'success' && 'bg-success/20 text-success',
        variant === 'warning' && 'bg-warning/20 text-warning',
        variant === 'destructive' && 'bg-destructive/20 text-destructive'
      )}
    >
      {status === 'ready' ? 'Ready' : status === 'processing' || status === 'queued' ? 'Processing' : status}
    </span>
  )
}

export function ExportHistoryList({ projectId, limit = 20 }: ExportHistoryListProps) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['export-history', projectId, limit],
    queryFn: () => listExportHistory(projectId, limit),
  })

  const handleDownload = async (jobId: string, format: string) => {
    try {
      await downloadExport(jobId, `decision-log.${format}`)
    } catch {
      // Error handled by downloadExport or toast
    }
  }

  return (
    <Card className="card-hover">
      <CardHeader>
        <CardTitle>Export history</CardTitle>
        <CardDescription>
          Recent exports and their status. Download when ready.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No exports yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your export history will appear here after you generate an export.
            </p>
          </div>
        ) : (
          <div className="space-y-2" role="list">
            {history.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {item.format === 'pdf' ? (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <p className="font-medium">
                      {item.decisionCount} decision{item.decisionCount !== 1 ? 's' : ''} · {item.format.toUpperCase()}
                      {item.signed && ' (signed)'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  {item.status === 'ready' && item.downloadUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(item.exportJobId, item.format)}
                      aria-label={`Download ${item.format} export`}
                    >
                      <Download className="h-4 w-4" />
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
