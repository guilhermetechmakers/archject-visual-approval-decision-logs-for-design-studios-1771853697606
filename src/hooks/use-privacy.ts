import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  createExport,
  listExports,
  getExport,
  createDeletion,
  getDeletion,
  getBackups,
  type CreateExportRequest,
  type CreateDeletionRequest,
} from '@/api/privacy'

export function useCreateExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body?: CreateExportRequest) => createExport(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['privacy', 'exports'] })
      toast.success('Export requested. Your archive will be ready shortly.')
    },
    onError: (error) => {
      toast.error((error as Error).message ?? 'Failed to request export')
    },
  })
}

export function useExportsList() {
  return useQuery({
    queryKey: ['privacy', 'exports'],
    queryFn: listExports,
  })
}

export function useExport(id: string | null) {
  return useQuery({
    queryKey: ['privacy', 'exports', id],
    queryFn: () => {
      if (!id) throw new Error('Export ID required')
      return getExport(id)
    },
    enabled: Boolean(id),
  })
}

export function useCreateDeletion() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateDeletionRequest) => createDeletion(body),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['privacy', 'deletions'] })
      toast.success(
        `Deletion scheduled for ${data.scheduled_for ? new Date(data.scheduled_for).toLocaleDateString() : 'soon'}. You can cancel within the hold window.`
      )
    },
    onError: (error) => {
      toast.error((error as Error).message ?? 'Failed to request deletion')
    },
  })
}

export function useDeletion(id: string | null) {
  return useQuery({
    queryKey: ['privacy', 'deletions', id],
    queryFn: () => {
      if (!id) throw new Error('Deletion ID required')
      return getDeletion(id)
    },
    enabled: Boolean(id),
  })
}

export function useBackups() {
  return useQuery({
    queryKey: ['privacy', 'backups'],
    queryFn: getBackups,
  })
}
