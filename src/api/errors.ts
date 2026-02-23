import { api } from '@/lib/api'

export interface ErrorReportPayload {
  timestamp: string
  userId?: string | null
  route: string
  method?: string
  url?: string
  requestId?: string
  errorMessage: string
  stackTraceSummary?: string
  clientContext?: Record<string, unknown>
  tags?: string[]
  dedupToken?: string
}

export interface ErrorReportResponse {
  incidentId: string
  receivedAt: string
}

export interface SupportTicketPayload {
  incidentId: string
  userId?: string | null
  email?: string
  message: string
  attachments?: unknown[]
}

export interface SupportTicketResponse {
  ticketId: string
  status: string
}

export const errorsApi = {
  report: (payload: ErrorReportPayload) =>
    api.post<ErrorReportResponse>('/errors/report', payload),

  createSupportTicket: (payload: SupportTicketPayload) =>
    api.post<SupportTicketResponse>('/support/ticket', payload),
}
