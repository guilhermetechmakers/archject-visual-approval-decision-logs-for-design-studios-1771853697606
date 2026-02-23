import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Download, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getFileVersions,
  restoreFileVersion,
  downloadLibraryFile,
} from '@/api/library'
import type { LibraryFile, LibraryFileVersion } from '@/types'
import { toast } from 'sonner'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface VersionHistoryModalProps {
  open: boolean
  onClose: () => void
  file: LibraryFile | null
  projectId: string
}

export function VersionHistoryModal({
  open,
  onClose,
  file,
  projectId,
}: VersionHistoryModalProps) {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['file-versions', projectId, file?.id],
    queryFn: () => getFileVersions(projectId, file!.id),
    enabled: open && !!file?.id,
  })

  const restoreMutation = useMutation({
    mutationFn: ({ versionId }: { versionId: string }) =>
      restoreFileVersion(projectId, file!.id, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['library-files', projectId] })
      queryClient.invalidateQueries({ queryKey: ['file-versions', projectId, file?.id] })
      toast.success('Version restored')
      onClose()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Restore failed'),
  })

  const versions: LibraryFileVersion[] = Array.isArray(data) ? data : []
  const currentVersionId = file?.currentVersionId

  const handleRestore = (v: LibraryFileVersion) => {
    if (v.id === currentVersionId) return
    restoreMutation.mutate({ versionId: v.id })
  }

  const handleDownload = async (v: LibraryFileVersion) => {
    try {
      await downloadLibraryFile(projectId, file!.id, `${file!.filename} (v${v.versionNumber})`)
      toast.success('Download started')
    } catch {
      toast.error('Download failed')
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={onClose} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            {file?.filename} — {versions.length} version{versions.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto py-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : versions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">No versions yet</p>
          ) : (
            <div className="space-y-2">
              {versions.map((v) => (
                <div
                  key={v.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border border-border p-4 transition-colors',
                    v.id === currentVersionId && 'border-primary bg-primary/5'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {v.versionNumber}</span>
                      {v.id === currentVersionId && (
                        <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(v.uploadedAt)} · {formatSize(v.size)}
                      {v.notes && ` · ${v.notes}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(v)}
                      aria-label="Download version"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {v.id !== currentVersionId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(v)}
                        disabled={restoreMutation.isPending}
                        aria-label="Restore version"
                      >
                        {restoreMutation.isPending ? (
                          <span className="animate-spin">⟳</span>
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
