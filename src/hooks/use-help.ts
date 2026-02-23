import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { helpApi, type SupportTicketPayload } from '@/api/help'

const KB_QUERY_KEY = ['help', 'kb']
const FEATURED_QUERY_KEY = ['help', 'featured']
const CHECKLIST_QUERY_KEY = ['help', 'checklist']

export function useKbArticles(params?: {
  query?: string
  tags?: string
  page?: number
  limit?: number
  sort?: string
  sortDir?: string
}) {
  return useQuery({
    queryKey: [...KB_QUERY_KEY, params],
    queryFn: () => helpApi.getArticles(params),
  })
}

export function useFeaturedArticles() {
  return useQuery({
    queryKey: FEATURED_QUERY_KEY,
    queryFn: () => helpApi.getFeaturedArticles(),
  })
}

export function useKbArticle(slug: string | undefined, enabled = true) {
  return useQuery({
    queryKey: [...KB_QUERY_KEY, 'article', slug],
    queryFn: () => helpApi.getArticle(slug!),
    enabled: !!slug && enabled,
  })
}

export function useChecklist(params?: { teamId?: string; userId?: string }) {
  return useQuery({
    queryKey: [...CHECKLIST_QUERY_KEY, params],
    queryFn: () => helpApi.getChecklist(params),
  })
}

export function useUpdateChecklistStep(params?: { teamId?: string; userId?: string }) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { stepKey: string; status: 'not_started' | 'in_progress' | 'completed' }) =>
      helpApi.updateChecklistStep({
        ...params,
        ...payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CHECKLIST_QUERY_KEY })
    },
  })
}

export function useCreateSupportTicket() {
  return useMutation({
    mutationFn: (payload: SupportTicketPayload) => helpApi.createSupportTicket(payload),
  })
}
