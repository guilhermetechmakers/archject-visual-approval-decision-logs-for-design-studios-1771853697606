import { api } from '@/lib/api'

export interface TermsVersion {
  id: string
  version_number: string
  slug: string
  content_markdown: string
  content_html?: string | null
  effective_date: string
  change_log: Array<{ date: string; note: string }>
}

export interface TermsVersionSummary {
  id: string
  version_number: string
  effective_date: string
  published: boolean
  change_log: Array<{ date: string; note: string }>
}

export interface AcceptTermsRequest {
  userId?: string
  versionId: string
  signupId?: string
}

export interface AcceptTermsResponse {
  acceptanceId: string
}

export async function getActiveTerms(): Promise<TermsVersion> {
  return api.get<TermsVersion>('/terms/active')
}

export async function getTermsVersions(): Promise<TermsVersionSummary[]> {
  return api.get<TermsVersionSummary[]>('/terms/versions')
}

export async function getTermsVersion(id: string): Promise<TermsVersion> {
  return api.get<TermsVersion>(`/terms/${id}`)
}

export async function acceptTerms(data: AcceptTermsRequest): Promise<AcceptTermsResponse> {
  return api.post<AcceptTermsResponse>('/terms/accept', data)
}
