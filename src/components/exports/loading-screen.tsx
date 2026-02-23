import { cn } from '@/lib/utils'

export interface LoadingScreenProps {
  /** Main operation title */
  title?: string
  /** Optional subtitle or step description */
  subtitle?: string
  /** 0-100 progress (optional - shows indeterminate if not provided) */
  progress?: number
  /** Estimated time in seconds (optional) */
  estimatedSeconds?: number
  /** Additional class names */
  className?: string
}

export function LoadingScreen({
  title = 'Processing',
  subtitle,
  progress,
  estimatedSeconds,
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'flex min-h-[280px] flex-col items-center justify-center rounded-xl border border-border bg-card p-8',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={`${title}${subtitle ? `: ${subtitle}` : ''}`}
    >
      <div className="relative">
        <div
          className="h-12 w-12 animate-spin rounded-full border-4 border-muted border-t-primary"
          aria-hidden
        />
      </div>
      <h2 className="mt-6 text-lg font-semibold">{title}</h2>
      {subtitle && (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      )}
      {progress != null && (
        <div className="mt-6 w-full max-w-xs">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {Math.round(progress)}%
          </p>
        </div>
      )}
      {estimatedSeconds != null && progress == null && (
        <p className="mt-4 text-sm text-muted-foreground">
          Estimated time: ~{estimatedSeconds}s
        </p>
      )}
    </div>
  )
}
