import { api } from '@/lib/api'
import type {
  SearchQueryPayload,
  SearchQueryResponse,
  AutocompleteResponse,
  SavedSearch,
} from '@/types/search'

export async function searchQuery(payload: SearchQueryPayload): Promise<SearchQueryResponse> {
  return api.post<SearchQueryResponse>('/search/query', payload)
}

export async function searchAutocomplete(
  q: string,
  contentTypes?: string[]
): Promise<AutocompleteResponse> {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (contentTypes?.length) contentTypes.forEach((t) => params.append('content_types', t))
  const qs = params.toString()
  return api.get<AutocompleteResponse>(`/search/autocomplete${qs ? `?${qs}` : ''}`)
}

export async function saveSearch(name: string, payload: SearchQueryPayload): Promise<{ savedSearchId: string }> {
  return api.post<{ savedSearchId: string }>('/search/save', { name, payload })
}

export async function getSavedSearch(id: string): Promise<SavedSearch> {
  return api.get<SavedSearch>(`/search/save/${id}`)
}

export async function getSavedSearches(): Promise<{ items: SavedSearch[] }> {
  return api.get<{ items: SavedSearch[] }>('/search/saved')
}

export async function attachSearchResult(
  resultId: string,
  targetType: 'decision' | 'template' | 'file',
  targetId: string
): Promise<{ attached: boolean; attachmentId?: string; message?: string }> {
  return api.post<{ attached: boolean; attachmentId?: string; message?: string }>('/search/attach', {
    resultId,
    targetType,
    targetId,
  })
}
