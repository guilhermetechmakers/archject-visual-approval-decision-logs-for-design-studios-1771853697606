import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface LoadingScreenProps {
  message?: string
  subtitle?: string
  estimatedTime?: string
  progress?: number
  className?: string
}

export function LoadingScreen({
  message = 'Processing…',
  subtitle,
  estimatedTime,
  progress,
  className,
}: LoadingScreenProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background p-6',
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-6 max-w-md text-center">
        <Loader2
          className="h-12 w-12 animate-spin text-primary"
          aria-hidden
        />
        <div>
          <h2 className="text-[22px] font-semibold">{message}</h2>
          {subtitle && (
            <p className="mt-1 text-[15px] text-muted-foreground">{subtitle}</p>
          )}
          {estimatedTime && (
            <p className="mt-2 text-sm text-muted-foreground">
              Estimated time: {estimatedTime}
            </p>
          )}
        </div>
        {progress != null && progress >= 0 && progress <= 100 && (
          <div className="w-full max-w-xs space-y-2">
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
          </div>
        )}
      </div>
    </div>
  )
}
