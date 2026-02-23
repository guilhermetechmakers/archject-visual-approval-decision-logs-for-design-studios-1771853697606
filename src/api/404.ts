import { api } from '@/lib/api'

export interface SupportReportPayload {
  email?: string
  message?: string
  attemptedPath: string
  userAgent: string
  userId?: string
  attachments?: unknown[]
}

export interface SupportReportResponse {
  ok: boolean
  ticketId?: string
}

export const notFoundApi = {
  reportBrokenLink: (data: SupportReportPayload) =>
    api.post<SupportReportResponse>('/support/report', data),
}
