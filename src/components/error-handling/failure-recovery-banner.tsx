/**
 * Persistent, non-destructive error panel for failure recovery.
 * Shows clear messaging, suggested actions, correlation ID, and retry controls.
 */
import { useCallback } from 'react'
import { AlertCircle, Copy, RefreshCw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { ApiError } from '@/lib/api'

export interface FailureRecoveryBannerProps {
  error: ApiError
  onRetry?: () => void | Promise<void>
  onDismiss?: () => void
  isRetrying?: boolean
  className?: string
}

export function FailureRecoveryBanner({
  error,
  onRetry,
  onDismiss,
  isRetrying = false,
  className,
}: FailureRecoveryBannerProps) {
  const correlationId = error.correlationId ?? (error.data?.correlationId as string) ?? (error.data?.incidentId as string)
  const canRetry = error.retryable !== false && onRetry

  const handleCopyId = useCallback(async () => {
    if (!correlationId) return
    try {
      await navigator.clipboard.writeText(correlationId)
    } catch {
      // ignore
    }
  }, [correlationId])

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-[#E5E7EB] bg-white p-4 shadow-[0px_2px_8px_rgba(0,0,0,0.06)]',
        'animate-in fade-in-up duration-300',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'rgb(239 68 68 / 0.15)', color: 'rgb(239 68 68)' }}
          aria-hidden
        >
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium" style={{ color: 'rgb(17 24 39)' }}>
            {error.message}
          </p>
          {error.details && error.details.length > 0 && (
            <ul className="mt-2 space-y-1 text-sm" style={{ color: 'rgb(107 114 128)' }}>
              {error.details.map((d, i) => (
                <li key={i}>
                  {d.field ? (
                    <span>
                      <strong>{d.field}:</strong> {d.message}
                    </span>
                  ) : (
                    d.message
                  )}
                </li>
              ))}
            </ul>
          )}
          {correlationId && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs" style={{ color: 'rgb(107 114 128)' }}>
                Reference ID:
              </span>
              <code className="rounded bg-[#F3F4F6] px-1.5 py-0.5 text-xs font-mono">
                {correlationId}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleCopyId}
                aria-label="Copy reference ID"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canRetry && (
            <Button
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
              className="rounded-lg"
              style={{ backgroundColor: 'rgb(0 82 204)', color: 'white' }}
            >
              {isRetrying ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="mr-1.5 h-4 w-4" />
                  Retry
                </>
              )}
            </Button>
          )}
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onDismiss}
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs" style={{ color: 'rgb(107 114 128)' }}>
        If the problem persists, contact support with the reference ID above.
      </p>
    </div>
  )
}
