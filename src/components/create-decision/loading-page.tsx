import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

export interface LoadingPageProps {
  message?: string
  percent?: number
  subtitle?: string
  className?: string
}

export function LoadingPage({
  message = 'Processing…',
  percent,
  subtitle,
  className,
}: LoadingPageProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-8',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-md space-y-6">
        <h2 className="text-center text-lg font-semibold">{message}</h2>
        {subtitle && (
          <p className="text-center text-sm text-muted-foreground">{subtitle}</p>
        )}
        {percent != null ? (
          <div className="space-y-2">
            <Progress value={percent} className="h-2" />
            <p className="text-center text-sm text-muted-foreground">{Math.round(percent)}%</p>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    </div>
  )
}
