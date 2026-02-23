import { useJobStatus } from '@/hooks/use-job-status'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface ExportProgressWidgetProps {
  jobId: string | null
  onComplete?: () => void
  onError?: (error: unknown) => void
  className?: string
}

/**
 * UI widget for background export job progress with live updates (poll).
 */
export function ExportProgressWidget({
  jobId,
  onComplete,
  onError,
  className,
}: ExportProgressWidgetProps) {
  const { state, percent, step, message } = useJobStatus(jobId, {
    useSSE: false,
    onComplete: () => onComplete?.(),
    onError: (job) => onError?.(job?.error),
  })

  if (!jobId) return null

  const isComplete = state === 'COMPLETED'
  const isFailed = state === 'FAILED'
  const isInProgress = state === 'QUEUED' || state === 'IN_PROGRESS'

  if (isComplete || isFailed) return null

  return (
    <div
      className={cn(
        'rounded-lg border border-[#E5E7EB] bg-white p-4 animate-fade-in',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0">
          <svg
            className="h-5 w-5 animate-spin text-[#0052CC]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#111827]">
            {isInProgress ? 'Generating export…' : 'Processing…'}
          </p>
          <p className="text-xs text-[#6B7280] mt-0.5">
            {step || message || 'Please wait'}
          </p>
          {percent != null && (
            <Progress value={percent} className="mt-2 h-1.5" />
          )}
        </div>
      </div>
    </div>
  )
}
