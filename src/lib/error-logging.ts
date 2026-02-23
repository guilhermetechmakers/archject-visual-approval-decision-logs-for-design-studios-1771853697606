/**
 * Centralized error logging service for 404 and other client-side errors.
 * Integrates with /api/logs/error endpoint.
 */

export interface Log404Payload {
  attemptedPath: string
  referrer?: string
  userId?: string | null
  sessionId?: string | null
  correlationId?: string
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

function getSessionId(): string | null {
  try {
    let sid = sessionStorage.getItem('archject_session_id')
    if (!sid) {
      sid = crypto.randomUUID()
      sessionStorage.setItem('archject_session_id', sid)
    }
    return sid
  } catch {
    return null
  }
}

/**
 * Log a 404 event to the centralized error pipeline.
 * Non-blocking; failures are silent to avoid disrupting UX.
 */
export function log404(payload: Log404Payload): void {
  const sessionId = getSessionId()
  const body = {
    level: 'error' as const,
    type: '404',
    message: `Page not found: ${payload.attemptedPath}`,
    attemptedPath: payload.attemptedPath.slice(0, 2048),
    referrer: payload.referrer ?? (document.referrer || undefined),
    userId: payload.userId ?? undefined,
    sessionId: payload.sessionId ?? sessionId ?? undefined,
    timestamp: new Date().toISOString(),
    correlationId: payload.correlationId ?? crypto.randomUUID(),
  }

  fetch(`${API_BASE}/logs/error`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  }).catch(() => {
    // Silent fail - do not disrupt user experience
  })
}
