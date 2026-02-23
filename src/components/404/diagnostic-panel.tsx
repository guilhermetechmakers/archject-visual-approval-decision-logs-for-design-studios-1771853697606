import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasAdminToken } from '@/api/admin'

export interface DiagnosticPanelProps {
  attemptedPath: string
  timestamp: string
  sessionId?: string | null
  userId?: string | null
  correlationId?: string
  className?: string
}

export function DiagnosticPanel({
  attemptedPath,
  timestamp,
  sessionId,
  userId,
  correlationId,
  className,
}: DiagnosticPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const isDev = import.meta.env.DEV
  const isAdmin = hasAdminToken()

  if (!isDev && !isAdmin) return null

  return (
    <div className={cn('rounded-lg border border-border bg-muted/30', className)}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-4 py-2 text-left text-sm text-muted-foreground hover:bg-muted/50"
        aria-expanded={expanded}
      >
        <span>Diagnostic info (dev/admin only)</span>
        {expanded ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {expanded && (
        <div className="border-t border-border px-4 py-3 font-mono text-xs text-muted-foreground">
          <dl className="space-y-1">
            <div>
              <dt className="inline font-medium text-foreground">Route:</dt>{' '}
              <dd className="inline">{attemptedPath}</dd>
            </div>
            <div>
              <dt className="inline font-medium text-foreground">Timestamp:</dt>{' '}
              <dd className="inline">{timestamp}</dd>
            </div>
            {sessionId && (
              <div>
                <dt className="inline font-medium text-foreground">Session ID:</dt>{' '}
                <dd className="inline break-all">{sessionId}</dd>
              </div>
            )}
            {userId && (
              <div>
                <dt className="inline font-medium text-foreground">User ID:</dt>{' '}
                <dd className="inline">{userId}</dd>
              </div>
            )}
            {correlationId && (
              <div>
                <dt className="inline font-medium text-foreground">Correlation ID:</dt>{' '}
                <dd className="inline break-all">{correlationId}</dd>
              </div>
            )}
          </dl>
        </div>
      )}
    </div>
  )
}
