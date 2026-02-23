import { api } from '@/lib/api'

export interface ReportBrokenLinkPayload {
  email?: string
  message?: string
  attemptedPath: string
  userAgent: string
  userId?: string
  attachments?: unknown[]
}

export interface ReportBrokenLinkResponse {
  ok: boolean
  ticketId?: string
}

export const supportApi = {
  reportBrokenLink: (payload: ReportBrokenLinkPayload) =>
    api.post<ReportBrokenLinkResponse>('/support/report', payload),
}
