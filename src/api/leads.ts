import { api } from '@/lib/api'

export interface DemoLeadPayload {
  name: string
  email: string
  studioName?: string
  phone?: string
  studioSize?: string
  message?: string
  utmSource?: string
  website?: string
}

export interface SignupLeadPayload {
  email: string
  utmSource?: string
  website?: string
}

export interface LeadResponse {
  id: string
  message: string
}

export const leadsApi = {
  submitDemo: (data: DemoLeadPayload) =>
    api.post<LeadResponse>('/leads/demo', data),

  submitSignup: (data: SignupLeadPayload) =>
    api.post<LeadResponse>('/leads/signup', data),
}
