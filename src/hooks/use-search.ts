import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  searchQuery,
  searchAutocomplete,
  saveSearch,
  getSavedSearch,
  getSavedSearches,
  attachSearchResult,
} from '@/api/search'
import type { SearchQueryPayload } from '@/types/search'

export const searchKeys = {
  all: ['search'] as const,
  query: (payload: SearchQueryPayload) => ['search', 'query', payload] as const,
  autocomplete: (q: string, types?: string[]) => ['search', 'autocomplete', q, types] as const,
  saved: () => ['search', 'saved'] as const,
  savedOne: (id: string) => ['search', 'saved', id] as const,
}

export function useSearchQuery(payload: SearchQueryPayload, enabled = true) {
  return useQuery({
    queryKey: searchKeys.query(payload),
    queryFn: () => searchQuery(payload),
    enabled:
      enabled &&
      (!!payload.query?.trim() ||
        !!payload.filters?.content_types?.length ||
        !!payload.filters?.status?.length ||
        !!payload.filters?.projects?.length ||
        !!payload.filters?.assignees?.length ||
        !!payload.filters?.tags?.length ||
        !!payload.filters?.dateRange?.from ||
        !!payload.filters?.dateRange?.to),
    staleTime: 30 * 1000,
  })
}

export function useSearchAutocomplete(q: string, contentTypes?: string[]) {
  return useQuery({
    queryKey: searchKeys.autocomplete(q, contentTypes),
    queryFn: () => searchAutocomplete(q, contentTypes),
    enabled: q.trim().length >= 2,
    staleTime: 60 * 1000,
  })
}

export function useSavedSearches() {
  return useQuery({
    queryKey: searchKeys.saved(),
    queryFn: getSavedSearches,
  })
}

export function useSavedSearch(id: string | null) {
  return useQuery({
    queryKey: searchKeys.savedOne(id ?? ''),
    queryFn: () => getSavedSearch(id!),
    enabled: !!id,
  })
}

export function useSaveSearch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ name, payload }: { name: string; payload: SearchQueryPayload }) =>
      saveSearch(name, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.saved() })
    },
  })
}

export function useAttachSearchResult() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      resultId,
      targetType,
      targetId,
    }: {
      resultId: string
      targetType: 'decision' | 'template' | 'file'
      targetId: string
    }) => attachSearchResult(resultId, targetType, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchKeys.all })
    },
  })
}
