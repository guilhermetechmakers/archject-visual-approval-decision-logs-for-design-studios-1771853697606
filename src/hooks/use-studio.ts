import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  getStudio,
  updateStudio,
  inviteTeamMember,
  updateTeamMemberRole,
  removeTeamMember,
  updateEmailTemplate,
} from '@/api/studios'

const STUDIO_ID = 'default'

export function useStudio() {
  return useQuery({
    queryKey: ['studio', STUDIO_ID],
    queryFn: () => getStudio(STUDIO_ID),
  })
}

export function useUpdateStudio() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name?: string; logo_url?: string | null; brand_color?: string }) =>
      updateStudio(STUDIO_ID, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', STUDIO_ID] })
      toast.success('Branding saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useInviteTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { email: string; role: string }) => inviteTeamMember(STUDIO_ID, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', STUDIO_ID] })
      toast.success('Invitation sent')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateTeamMemberRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateTeamMemberRole(STUDIO_ID, memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', STUDIO_ID] })
      toast.success('Role updated')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (memberId: string) => removeTeamMember(STUDIO_ID, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', STUDIO_ID] })
      toast.success('Member removed')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ key, subject, body }: { key: string; subject: string; body: string }) =>
      updateEmailTemplate(STUDIO_ID, key, { subject, body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studio', STUDIO_ID] })
      toast.success('Template saved')
    },
    onError: (err: Error) => toast.error(err.message),
  })
}
