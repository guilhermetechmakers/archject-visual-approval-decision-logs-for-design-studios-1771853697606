import { logsApi } from '@/api/logs'
import { getUserIdFromToken } from '@/lib/auth-utils'

function getSessionId(): string {
  try {
    return sessionStorage.getItem('archject_session_id') ?? crypto.randomUUID()
  } catch {
    return crypto.randomUUID()
  }
}

function persistSessionId(id: string): void {
  try {
    sessionStorage.setItem('archject_session_id', id)
  } catch {
    // ignore
  }
}

export interface Log404Params {
  attemptedPath: string
  referrer?: string
  userId?: string
  sessionId?: string
}

/**
 * Logs a 404 event to the centralized error/analytics pipeline.
 * Call on 404 page mount. Fails silently to avoid disrupting UX.
 */
export function log404(params: Log404Params): void {
  const sessionId = params.sessionId ?? getSessionId()
  persistSessionId(sessionId)
  const userId = params.userId ?? getUserIdFromToken()

  logsApi
    .logError({
      level: 'error',
      type: '404',
      message: `404 Not Found: ${params.attemptedPath}`,
      attemptedPath: params.attemptedPath,
      referrer: params.referrer ?? (typeof document !== 'undefined' ? document.referrer : undefined),
      userId: userId ?? undefined,
      sessionId,
    })
    .catch(() => {
      // Fail silently; do not disrupt user experience
    })
}
