import * as React from 'react'
import { cn } from '@/lib/utils'
import { Clock } from 'lucide-react'

export interface RateLimitNoticeProps extends React.HTMLAttributes<HTMLDivElement> {
  nextAllowedAt?: number | null
}

function formatTimeUntil(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  if (seconds < 60) return `${seconds} seconds`
  const minutes = Math.ceil(seconds / 60)
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.ceil(minutes / 60)
  return `${hours} hour${hours > 1 ? 's' : ''}`
}

function RateLimitNotice({ nextAllowedAt, className, children, ...props }: RateLimitNoticeProps) {
  const [remaining, setRemaining] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!nextAllowedAt) {
      setRemaining(null)
      return
    }

    const update = () => {
      const now = Date.now()
      const diff = nextAllowedAt - now
      if (diff <= 0) {
        setRemaining(null)
        return
      }
      setRemaining(formatTimeUntil(diff))
    }

    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [nextAllowedAt])

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning',
        className
      )}
      {...props}
    >
      <Clock className="h-4 w-4 shrink-0" aria-hidden />
      <span>
        {children}
        {remaining && (
          <span className="font-medium"> Try again in {remaining}.</span>
        )}
      </span>
    </div>
  )
}

export { RateLimitNotice }
