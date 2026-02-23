import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, Copy, Loader2, Server } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SupportModal } from './support-modal'
import { cn } from '@/lib/utils'

export interface ErrorContext {
  message?: string
  route?: string
  stackSummary?: string
}

export interface ServerErrorPageProps {
  errorContext?: ErrorContext
  incidentId: string
  onRetry?: () => void | Promise<void>
  onBackToSafeRoute?: () => void
  /** Safe route for "Back to dashboard" - defaults to /dashboard/overview or / */
  safeRoute?: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function isValidIncidentId(id: string): boolean {
  return UUID_REGEX.test(id)
}

export function ServerErrorPage({
  errorContext,
  incidentId,
  onRetry,
  onBackToSafeRoute,
  safeRoute,
}: ServerErrorPageProps) {
  const navigate = useNavigate()
  const [isRetrying, setIsRetrying] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const displayId = isValidIncidentId(incidentId) ? incidentId : 'N/A'

  const handleRetry = useCallback(async () => {
    if (onRetry) {
      setIsRetrying(true)
      try {
        await onRetry()
      } finally {
        setIsRetrying(false)
      }
    } else {
      window.location.reload()
    }
  }, [onRetry])

  const handleBackToSafe = useCallback(() => {
    if (onBackToSafeRoute) {
      onBackToSafeRoute()
    } else {
      const route = safeRoute ?? '/dashboard/overview'
      navigate(route)
    }
  }, [onBackToSafeRoute, safeRoute, navigate])

  const handleCopyId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(displayId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      setCopied(false)
    }
  }, [displayId])

  return (
    <div
      className="min-h-screen bg-[#F7F7F9] flex items-center justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgb(247 247 249)' }}
      role="alert"
      aria-live="assertive"
      aria-labelledby="server-error-heading"
    >
      <Card
        className="w-full max-w-[720px] overflow-hidden shadow-[0px_2px_8px_rgba(0,0,0,0.06)] border border-[#E5E7EB]"
        style={{
          backgroundColor: 'rgb(255 255 255)',
          boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
        }}
      >
        <CardContent className="p-8 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div className="flex shrink-0">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#E5E7EB] text-[#6B7280]"
                aria-hidden
              >
                <Server className="h-7 w-7" />
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{ backgroundColor: 'rgb(239 68 68 / 0.15)', color: 'rgb(239 68 68)' }}
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  Server Error
                </span>
              </div>

              <h1
                id="server-error-heading"
                className="text-[28px] font-bold leading-tight"
                style={{ color: 'rgb(17 24 39)' }}
              >
                Something went wrong
              </h1>

              <p
                className="text-[15px] leading-relaxed"
                style={{ color: 'rgb(107 114 128)' }}
                aria-live="polite"
              >
                We hit an internal error while loading this page. You can retry, or contact support if the problem persists.
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="text-sm"
                  style={{ color: 'rgb(107 114 128)' }}
                >
                  Incident ID:
                </span>
                <code
                  className="rounded bg-[#F3F4F6] px-2 py-1 text-sm font-mono"
                  style={{ color: 'rgb(17 24 39)' }}
                >
                  {displayId}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={handleCopyId}
                  aria-label={copied ? 'Copied!' : 'Copy incident ID'}
                  title={copied ? 'Copied!' : 'Copy incident ID'}
                >
                  <Copy className="h-4 w-4" />
                  {copied && (
                    <span className="sr-only" aria-live="polite">
                      Copied!
                    </span>
                  )}
                </Button>
                {copied && (
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'rgb(0 82 204)' }}
                  >
                    Copied!
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  size="lg"
                  className={cn(
                    'rounded-lg px-5 py-3 transition-all duration-200',
                    'hover:scale-[1.02] active:scale-[0.98]'
                  )}
                  style={{
                    backgroundColor: 'rgb(0 82 204)',
                    color: 'white',
                  }}
                  onClick={handleRetry}
                  disabled={isRetrying}
                  isLoading={isRetrying}
                >
                  {isRetrying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    'Retry'
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-lg text-[#0052CC] underline-offset-4 hover:underline"
                  onClick={() => setSupportOpen(true)}
                >
                  Contact support
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-lg"
                  onClick={handleBackToSafe}
                >
                  Back to dashboard
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <SupportModal
        open={supportOpen}
        onOpenChange={setSupportOpen}
        incidentId={displayId}
        route={errorContext?.route ?? window.location.pathname}
      />
    </div>
  )
}
