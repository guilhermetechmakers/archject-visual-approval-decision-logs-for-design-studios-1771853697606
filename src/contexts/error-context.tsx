/**
 * Centralized error context for non-disruptive error banner with retry.
 * Provides current error, status, retry option, and correlation ID display.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'
import { AlertCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface StructuredError {
  code?: string
  message: string
  details?: { field?: string; message: string; code?: string }[]
  correlationId?: string
  retryable?: boolean
  status?: number
}

interface ErrorContextValue {
  error: StructuredError | null
  setError: (err: StructuredError | null) => void
  clearError: () => void
  showRetryable: (err: StructuredError, onRetry?: () => void | Promise<void>) => void
}

const ErrorContext = createContext<ErrorContextValue | null>(null)

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [error, setErrorState] = useState<StructuredError | null>(null)
  const [onRetry, setOnRetry] = useState<(() => void | Promise<void>) | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const setError = useCallback((err: StructuredError | null) => {
    setErrorState(err)
    if (!err) setOnRetry(null)
  }, [])

  const clearError = useCallback(() => {
    setErrorState(null)
    setOnRetry(null)
  }, [])

  const showRetryable = useCallback(
    (err: StructuredError, retryFn?: () => void | Promise<void>) => {
      setErrorState(err)
      setOnRetry(retryFn ?? null)
    },
    []
  )

  const handleRetry = useCallback(async () => {
    const fn = onRetry
    if (fn) {
      setIsRetrying(true)
      try {
        await fn()
        clearError()
      } finally {
        setIsRetrying(false)
      }
    } else {
      window.location.reload()
    }
  }, [onRetry, clearError])

  const value: ErrorContextValue = {
    error,
    setError,
    clearError,
    showRetryable,
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className={cn(
            'fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-2xl animate-fade-in-up',
            'rounded-lg border border-destructive/30 bg-card p-4 shadow-lg',
            'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'
          )}
        >
          <div className="flex items-start gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-destructive/30 bg-destructive/10"
              aria-hidden
            >
              <AlertCircle className="h-5 w-5 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{error.message}</p>
              {error.details && error.details.length > 0 && (
                <ul className="mt-1 list-inside list-disc text-xs text-muted-foreground">
                  {error.details.slice(0, 3).map((d, i) => (
                    <li key={i}>{d.message}</li>
                  ))}
                </ul>
              )}
              {error.correlationId && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Reference: <code className="rounded bg-muted px-1">{error.correlationId}</code>
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {(error.retryable ?? !!onRetry) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="h-9"
              >
                {isRetrying ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Retrying...
                  </>
                ) : (
                  'Retry'
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={clearError}
              aria-label="Dismiss error"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </ErrorContext.Provider>
  )
}

export function useErrorContext(): ErrorContextValue {
  const ctx = useContext(ErrorContext)
  if (!ctx) {
    return {
      error: null,
      setError: () => {},
      clearError: () => {},
      showRetryable: () => {},
    }
  }
  return ctx
}
