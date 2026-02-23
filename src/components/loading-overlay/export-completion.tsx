import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { downloadResult } from '@/api/jobs'
import type { ResultUrl, JobError } from '@/types/jobs'

export interface ExportCompletionProps {
  success: boolean
  resultUrls?: ResultUrl[]
  error?: JobError | null
  onClose: () => void
  onRetry?: () => void
  onViewExportHistory?: () => void
  /** Link to Exports & Decision Logs page */
  exportsPagePath?: string
  /** Optional: open exported Decision in Decision Detail page */
  decisionDetailPath?: string
}

export function ExportCompletion({
  success,
  resultUrls = [],
  error,
  onClose,
  onRetry,
  onViewExportHistory,
  exportsPagePath = '/dashboard/exports',
  decisionDetailPath,
}: ExportCompletionProps) {
  const [downloading, setDownloading] = useState<string | null>(null)

  const handleDownload = async (url: string, name: string) => {
    setDownloading(name)
    try {
      await downloadResult(url)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-6">
      {success ? (
        <>
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10"
              aria-hidden
            >
              <CheckCircle2 className="h-10 w-10 text-success animate-scale-in" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Export complete</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Your files are ready to download.
              </p>
            </div>
          </div>

          {resultUrls.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium">Downloads</p>
              <div className="flex flex-col gap-2">
                {resultUrls.map((r, i) => (
                  <Button
                    key={i}
                    variant="default"
                    className="w-full justify-start gap-2"
                    onClick={() => handleDownload(r.url, r.name)}
                    disabled={downloading === r.name}
                  >
                    <Download className="h-4 w-4" />
                    {downloading === r.name ? 'Downloading…' : r.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            {onViewExportHistory ? (
              <Button variant="outline" onClick={onViewExportHistory}>
                View export history
              </Button>
            ) : (
              <Link to={exportsPagePath}>
                <Button variant="outline">View export history</Button>
              </Link>
            )}
            {decisionDetailPath && (
              <Link to={decisionDetailPath}>
                <Button variant="outline">Open Decision</Button>
              </Link>
            )}
            <Button onClick={onClose}>Close</Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
              aria-hidden
            >
              <XCircle className="h-10 w-10 text-destructive" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Export failed</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {error?.message ?? 'An unexpected error occurred.'}
              </p>
              {(error?.code || error?.correlationId || error?.trace_id) && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {error.code && <>Error code: {error.code}</>}
                  {(error.code && (error.correlationId || error.trace_id)) && ' · '}
                  {(error.correlationId || error.trace_id) && (
                    <>
                      Reference ID:{' '}
                      <code className="rounded bg-muted px-1.5 py-0.5 font-mono">
                        {error.correlationId ?? error.trace_id}
                      </code>
                      {' — include when contacting support'}
                    </>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {onRetry && (
              <Button variant="outline" onClick={onRetry}>
                Retry
              </Button>
            )}
            {exportsPagePath && (
              <Link to={exportsPagePath}>
                <Button variant="outline">View logs</Button>
              </Link>
            )}
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
