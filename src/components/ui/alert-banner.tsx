import * as React from 'react'
import { cn } from '@/lib/utils'
import { AlertCircle, CheckCircle2, Info } from 'lucide-react'

export interface AlertBannerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'error' | 'warning'
  title?: string
}

function AlertBanner({ variant = 'default', title, className, children, ...props }: AlertBannerProps) {
  const Icon = variant === 'success' ? CheckCircle2 : variant === 'error' ? AlertCircle : Info

  return (
    <div
      role="alert"
      className={cn(
        'flex gap-3 rounded-lg border p-4',
        {
          'border-success/30 bg-success/5 text-success': variant === 'success',
          'border-destructive/30 bg-destructive/5 text-destructive': variant === 'error',
          'border-warning/30 bg-warning/5 text-warning': variant === 'warning',
          'border-border bg-muted/50': variant === 'default',
        },
        className
      )}
      {...props}
    >
      <Icon className="h-5 w-5 shrink-0" aria-hidden />
      <div className="flex-1">
        {title && <p className="font-medium">{title}</p>}
        <div className={cn('text-sm', title && 'mt-1')}>{children}</div>
      </div>
    </div>
  )
}

export { AlertBanner }
