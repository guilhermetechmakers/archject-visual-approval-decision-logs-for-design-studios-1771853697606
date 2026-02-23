import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listExports,
  listExportsAll,
  createExport,
  getExport,
  downloadExport,
} from '@/api/exports'
import type { CreateExportPayload } from '@/types/exports'
import { toast } from 'sonner'

export const exportKeys = {
  all: ['exports'] as const,
  list: (projectId: string | null, limit?: number) =>
    projectId ? ['exports', projectId, limit] as const : ['exports', 'all', limit] as const,
  detail: (id: string) => ['exports', id] as const,
}

export function useExports(projectId: string | null, limit = 30) {
  return useQuery({
    queryKey: exportKeys.list(projectId, limit),
    queryFn: () =>
      projectId ? listExports(projectId, limit) : listExportsAll(limit),
    enabled: true,
  })
}

export function useExportDetail(exportId: string | null) {
  return useQuery({
    queryKey: exportKeys.detail(exportId ?? ''),
    queryFn: () => getExport(exportId!),
    enabled: !!exportId,
  })
}

export function useCreateExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateExportPayload) => createExport(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: exportKeys.all })
      queryClient.invalidateQueries({
        queryKey: exportKeys.list(variables.projectId, undefined),
      })
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to start export')
    },
  })
}

export function useDownloadExport() {
  return useMutation({
    mutationFn: ({ exportId, fileName }: { exportId: string; fileName?: string }) =>
      downloadExport(exportId, fileName),
    onSuccess: () => {
      toast.success('Download started')
    },
    onError: () => {
      toast.error('Download failed')
    },
  })
}
