import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 0-100 when determinate */
  value?: number
  /** When true, shows indeterminate spinner/stripe animation */
  indeterminate?: boolean
}

const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  ({ className, value = 0, indeterminate = false, ...props }, ref) => {
    const percentage = Math.min(100, Math.max(0, value))

    if (indeterminate) {
      return (
        <div
          ref={ref}
          role="progressbar"
          aria-valuetext="Processing…"
          aria-label="Processing…"
          className={cn('flex items-center justify-center', className)}
          {...props}
        >
          <svg
            className="h-8 w-8 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
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
          <span className="sr-only">Processing…</span>
        </div>
      )
    }

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-label={`${Math.round(percentage)}% complete`}
        className={cn(
          'relative h-2 w-full overflow-hidden rounded-full bg-muted',
          className
        )}
        {...props}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    )
  }
)
ProgressBar.displayName = 'ProgressBar'

export { ProgressBar }
