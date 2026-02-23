/**
 * Centralized error store for failure recovery UI.
 * Surfaces current error, status, and retry option for recoverable errors.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ApiError } from '@/lib/api'

export interface ErrorStoreState {
  error: ApiError | null
  isRetrying: boolean
}

export interface ErrorStoreActions {
  setError: (error: ApiError | null) => void
  clearError: () => void
  retry: (retryFn: () => Promise<void>) => Promise<void>
}

const ErrorStoreContext = createContext<ErrorStoreState & ErrorStoreActions | null>(null)

export function ErrorStoreProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<ApiError | null>(null)
  const [isRetrying, setIsRetrying] = useState(false)

  const clearError = useCallback(() => setError(null), [])

  const retry = useCallback(
    async (retryFn: () => Promise<void>) => {
      setIsRetrying(true)
      try {
        await retryFn()
        setError(null)
      } catch (e) {
        setError({
          message: (e as ApiError).message ?? 'Retry failed',
          code: (e as ApiError).code,
          status: (e as ApiError).status,
          details: (e as ApiError).details,
          correlationId: (e as ApiError).correlationId,
          retryable: (e as ApiError).retryable,
          data: (e as ApiError).data,
        })
      } finally {
        setIsRetrying(false)
      }
    },
    []
  )

  const value = useMemo(
    () => ({
      error,
      isRetrying,
      setError,
      clearError,
      retry,
    }),
    [error, isRetrying, clearError, retry]
  )

  return (
    <ErrorStoreContext.Provider value={value}>
      {children}
    </ErrorStoreContext.Provider>
  )
}

export function useErrorStore() {
  const ctx = useContext(ErrorStoreContext)
  if (!ctx) return null
  return ctx
}
