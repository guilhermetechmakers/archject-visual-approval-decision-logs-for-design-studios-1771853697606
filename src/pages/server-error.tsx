import { ServerErrorPage } from '@/components/500'
import { RetryManager } from '@/lib/retry-manager'

/**
 * Standalone 500 Server Error page route.
 * Used for direct navigation (e.g. /500) or when the app needs to show the error page.
 */
export function ServerErrorPageRoute() {
  return (
    <ServerErrorPage
      incidentId={crypto.randomUUID()}
      errorContext={{ route: '/500' }}
      onRetry={() => RetryManager.retryPage()}
      safeRoute="/dashboard/overview"
    />
  )
}
