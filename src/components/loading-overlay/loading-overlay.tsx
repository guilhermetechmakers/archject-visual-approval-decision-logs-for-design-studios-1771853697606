import { useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ProgressBar } from '@/components/loading-overlay/progress-bar'
import { StepperList } from '@/components/loading-overlay/stepper-list'
import { ExportCompletion } from '@/components/loading-overlay/export-completion'
import { useJobStatus } from '@/hooks/use-job-status'
import { cn } from '@/lib/utils'
import type { JobStep } from '@/types/jobs'

export type LoadingOverlayVariant = 'fullscreen' | 'modal' | 'inline'

export interface LoadingOverlayProps {
  /** When provided, subscribes to job updates via polling */
  jobId?: string | null
  operationName: string
  subtitle?: string
  /** Controlled mode: show determinate progress */
  determinate?: boolean
  /** Controlled mode: 0-100 percent */
  percent?: number
  /** Controlled mode: steps for stepper */
  steps?: JobStep[]
  /** Cancellable - show Cancel button */
  cancellable?: boolean
  onCancel?: () => void
  onComplete?: () => void
  onError?: (error: unknown) => void
  /** Auto-close when complete */
  autoClose?: boolean
  variant?: LoadingOverlayVariant
  open: boolean
  onOpenChange?: (open: boolean) => void
  /** For retry */
  onRetry?: () => void
  /** Link to exports page */
  exportsPagePath?: string
  /** Optional: open exported Decision in Decision Detail page */
  decisionDetailPath?: string
}

const focusableElements = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(focusableElements))
}

export function LoadingOverlay({
  jobId,
  operationName,
  subtitle,
  determinate: propDeterminate,
  percent: propPercent,
  steps: propSteps,
  cancellable = true,
  onCancel,
  onComplete,
  onError,
  autoClose = false,
  variant = 'modal',
  open,
  onOpenChange,
  onRetry,
  exportsPagePath = '/dashboard/exports',
  decisionDetailPath,
}: LoadingOverlayProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  const {
    state,
    percent: jobPercent,
    step: jobStep,
    message,
    resultUrls,
    error,
    cancel,
    job,
  } = useJobStatus(jobId ?? null, {
    useSSE: false,
    onComplete: () => {
      onComplete?.()
      if (autoClose) {
        setTimeout(() => onOpenChange?.(false), 1500)
      }
    },
    onError: (job) => onError?.(job.error),
  })

  const percent = jobId ? (jobPercent ?? 0) : (propPercent ?? 0)
  const steps = jobId ? (job?.steps ?? []) : (propSteps ?? [])
  const determinate = jobId ? jobPercent != null : (propDeterminate ?? false)
  const currentStep = jobId ? jobStep : null

  const canCancel =
    cancellable &&
    (state === 'QUEUED' || state === 'IN_PROGRESS')

  const handleCancel = useCallback(() => {
    if (jobId) {
      cancel()
    }
    onCancel?.()
  }, [jobId, cancel, onCancel])

  const handleClose = useCallback(() => {
    onOpenChange?.(false)
  }, [onOpenChange])

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (canCancel) {
          handleCancel()
        } else if (state === 'COMPLETED' || state === 'FAILED' || state === 'CANCELLED') {
          handleClose()
        }
      }
    },
    [canCancel, handleCancel, handleClose, state]
  )

  useEffect(() => {
    if (!open || variant === 'inline') return
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, variant, handleKeyDown])

  useEffect(() => {
    if (!open || variant === 'inline') return
    const el = contentRef.current
    if (!el) return

    const focusables = getFocusableElements(el)
    if (focusables.length > 0) {
      focusables[0].focus()
    }

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const focusables = getFocusableElements(el)
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    el.addEventListener('keydown', handleTab)
    return () => el.removeEventListener('keydown', handleTab)
  }, [open, variant, state])

  if (!open) return null

  const isComplete = state === 'COMPLETED'
  const isFailed = state === 'FAILED'
  const isCancelled = state === 'CANCELLED'
  const showResult = isComplete || isFailed || isCancelled

  const stepText =
    steps.length > 0 && currentStep
      ? `Step ${steps.findIndex((s) => s.name === currentStep) + 1} of ${steps.length} — ${currentStep}`
      : message

  const cardContent = (
    <div
      ref={contentRef}
      className={cn(
        'rounded-xl border border-border bg-card p-6 shadow-xl',
        variant === 'inline' && 'max-w-md'
      )}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {operationName}: {stepText}
        {percent != null && ` ${Math.round(percent)}%`}
      </div>

      {showResult ? (
        isCancelled ? (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Operation canceled</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The operation was canceled. You can retry or close.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  Retry
                </Button>
              )}
              <Button onClick={handleClose}>Close</Button>
            </div>
          </div>
        ) : (
          <ExportCompletion
            success={isComplete}
            resultUrls={resultUrls}
            error={error}
            onClose={handleClose}
            onRetry={onRetry}
            exportsPagePath={exportsPagePath}
            decisionDetailPath={decisionDetailPath}
          />
        )
      ) : (
        <>
          <h2 id="loading-overlay-title" className="text-[22px] font-bold">{operationName}</h2>
          {subtitle && (
            <p className="mt-1 text-[15px] text-muted-foreground">
              {subtitle}
            </p>
          )}

          <div className="mt-6 space-y-4">
            {determinate ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {stepText}
                  </span>
                  <span className="text-sm font-medium">
                    {Math.round(percent ?? 0)}%
                  </span>
                </div>
                <ProgressBar value={percent ?? 0} />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <ProgressBar indeterminate />
                <p className="text-sm text-muted-foreground">
                  {stepText || 'Processing…'}
                </p>
              </div>
            )}

            {steps.length > 0 && (
              <StepperList steps={steps} currentStep={currentStep} />
            )}
          </div>

          {cancellable && (
            <div className="mt-6 flex justify-end">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={!canCancel}
                title={
                  !canCancel
                    ? 'Cancellation is not available at this stage'
                    : undefined
                }
              >
                Cancel
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )

  if (variant === 'inline') {
    return <div className="animate-fade-in">{cardContent}</div>
  }

  if (variant === 'fullscreen') {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-[#F7F7F9] p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loading-overlay-title"
      >
        <div className="w-full max-w-lg">{cardContent}</div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
      aria-hidden="true"
    >
      <div
        className="fixed inset-0 bg-black/50 animate-fade-in"
        aria-hidden="true"
      />
      <div
        className="relative z-50 w-full max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="loading-overlay-title"
      >
        {cardContent}
      </div>
    </div>
  )
}
