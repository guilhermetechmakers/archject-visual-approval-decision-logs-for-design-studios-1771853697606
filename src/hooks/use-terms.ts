import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getActiveTerms,
  getTermsVersions,
  acceptTerms,
  type AcceptTermsRequest,
} from '@/api/terms'

export function useActiveTerms() {
  return useQuery({
    queryKey: ['terms', 'active'],
    queryFn: getActiveTerms,
  })
}

export function useTermsVersions() {
  return useQuery({
    queryKey: ['terms', 'versions'],
    queryFn: getTermsVersions,
  })
}

export function useAcceptTerms() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: AcceptTermsRequest) => acceptTerms(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terms'] })
      toast.success('Terms accepted successfully')
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Failed to record acceptance')
    },
  })
}
