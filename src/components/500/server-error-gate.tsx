import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ServerErrorPage } from './server-error-page'
import { RetryManager } from '@/lib/retry-manager'

interface ServerErrorDetail {
  incidentId: string
  errorContext?: { route?: string }
}

export function ServerErrorGate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [error, setError] = useState<ServerErrorDetail | null>(null)

  useEffect(() => {
    const handler = (e: CustomEvent<ServerErrorDetail>) => {
      const detail = e.detail
      if (detail?.incidentId) {
        setError({
          incidentId: detail.incidentId,
          errorContext: detail.errorContext,
        })
      }
    }
    window.addEventListener('archject:server-error', handler as EventListener)
    return () => {
      window.removeEventListener('archject:server-error', handler as EventListener)
    }
  }, [])

  const handleRetry = () => {
    setError(null)
    RetryManager.retryPage()
  }

  const handleBackToSafe = () => {
    setError(null)
    navigate('/dashboard/overview')
  }

  if (error) {
    return (
      <ServerErrorPage
        incidentId={error.incidentId}
        errorContext={error.errorContext}
        onRetry={handleRetry}
        onBackToSafeRoute={handleBackToSafe}
      />
    )
  }

  return <>{children}</>
}
