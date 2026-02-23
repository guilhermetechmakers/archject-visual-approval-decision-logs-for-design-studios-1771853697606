import { api } from '@/lib/api'

export interface KbArticle {
  id: string
  slug: string
  title: string
  excerpt: string | null
  tags: string[]
  featured?: boolean
  updatedAt: string
  createdAt?: string
}

export interface KbArticleDetail extends KbArticle {
  body: string
  authorId: string | null
}

export interface KbListResponse {
  articles: KbArticle[]
  total: number
  page: number
  limit: number
}

export interface ChecklistStep {
  stepKey: string
  title: string
  description: string
  docSlug: string
  status: 'not_started' | 'in_progress' | 'completed'
  updatedAt?: string
}

export interface ChecklistResponse {
  steps: ChecklistStep[]
  progress: number
}

export interface SupportTicketPayload {
  name: string
  email: string
  projectId?: string
  subject: string
  description: string
  attachments?: { url: string; filename: string; size: number; mime: string }[]
  source?: 'help-form' | 'demo' | 'landing'
}

export interface SupportTicketResponse {
  id: string
  ticketId: string
  message: string
}

export interface UploadResponse {
  files: { url: string; filename: string; size: number; mime: string }[]
}

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

function buildKbParams(params?: {
  query?: string
  tags?: string | string[]
  page?: number
  limit?: number
  sort?: string
  sortDir?: string
}): string {
  const search = new URLSearchParams()
  if (params?.query) search.set('query', params.query)
  if (params?.tags) search.set('tags', Array.isArray(params.tags) ? params.tags.join(',') : params.tags)
  if (params?.page) search.set('page', String(params.page))
  if (params?.limit) search.set('limit', String(params.limit))
  if (params?.sort) search.set('sort', params.sort)
  if (params?.sortDir) search.set('sortDir', params.sortDir)
  return search.toString()
}

export const helpApi = {
  getArticles: (params?: Parameters<typeof buildKbParams>[0]) =>
    api.get<KbListResponse>(`/kb${buildKbParams(params) ? `?${buildKbParams(params)}` : ''}`),

  getFeaturedArticles: () => api.get<{ articles: KbArticle[] }>('/kb/featured'),

  getArticle: (slug: string) => api.get<KbArticleDetail>(`/kb/${slug}`),

  getChecklist: (params?: { teamId?: string; userId?: string }) => {
    const search = new URLSearchParams()
    if (params?.teamId) search.set('team_id', params.teamId)
    if (params?.userId) search.set('user_id', params.userId)
    const q = search.toString()
    return api.get<ChecklistResponse>(`/checklist${q ? `?${q}` : ''}`)
  },

  updateChecklistStep: (data: {
    teamId?: string
    userId?: string
    stepKey: string
    status: 'not_started' | 'in_progress' | 'completed'
  }) => api.post<{ id: string; stepKey: string; status: string; updatedAt: string }>('/checklist', data),

  createSupportTicket: (data: SupportTicketPayload) =>
    api.post<SupportTicketResponse>('/support/ticket', { ...data, source: data.source ?? 'help-form' }),

  uploadFiles: (files: File[]) => uploadFiles(files),
}

export async function uploadFiles(files: File[]): Promise<UploadResponse> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))

  const token = localStorage.getItem('auth_token')
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const url = `${API_BASE}/uploads`
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message ?? 'Upload failed')
  }
  return res.json()
}
