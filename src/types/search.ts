export type SearchContentType = 'project' | 'decision' | 'template' | 'file'

export interface SearchFilters {
  content_types?: SearchContentType[]
  status?: string[]
  assignees?: string[]
  projects?: string[]
  tags?: string[]
  dateRange?: { from?: string; to?: string }
}

export interface SearchQueryPayload {
  query?: string
  filters?: SearchFilters
  page?: number
  pageSize?: number
  sort?: { field?: string; order?: 'asc' | 'desc' }
}

export interface SearchResultItem {
  id: string
  type: SearchContentType
  title: string
  snippet: string
  project: { id: string; name: string } | null
  status: string | null
  assignee: { id: string; name: string } | null
  date: string | null
  highlights?: { title?: string; snippet?: string }
}

export interface SearchQueryResponse {
  total: number
  page: number
  pageSize: number
  results: SearchResultItem[]
}

export interface AutocompleteResponse {
  suggestions: string[]
  topHits: { id: string; type: string; title: string }[]
}

export interface SavedSearch {
  id: string
  name: string
  payload: SearchQueryPayload
  contentType: string | null
  createdAt: string
  updatedAt: string
  lastUsedAt?: string | null
}

/** API response shape for saved search (snake_case) */
export interface SavedSearchItem {
  id: string
  name: string
  payload: SearchQueryPayload
  content_type: string | null
  created_at: string
  updated_at: string
  last_used_at?: string | null
}
