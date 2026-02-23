import { api } from '@/lib/api'

export interface LogErrorPayload {
  level?: 'error' | 'warning' | 'info'
  type?: string
  message?: string
  attemptedPath?: string
  referrer?: string
  userId?: string
  sessionId?: string
  correlationId?: string
  meta?: Record<string, unknown>
}

export interface LogErrorResponse {
  ok: boolean
  id: string
  correlationId?: string
}

export const logsApi = {
  logError: (payload: LogErrorPayload) =>
    api.post<LogErrorResponse>('/logs/error', {
      ...payload,
      timestamp: new Date().toISOString(),
    }),
}
