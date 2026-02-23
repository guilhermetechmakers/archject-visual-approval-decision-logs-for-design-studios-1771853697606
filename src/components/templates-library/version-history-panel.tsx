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
import { RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getTemplateVersions,
  restoreTemplateVersion,
} from '@/api/templates'
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

export interface VersionHistoryPanelProps {
  open: boolean
  onOpenChange?: (open: boolean) => void
  onClose?: () => void
  templateId: string | null
  templateName?: string
}

export function VersionHistoryPanel({
  open,
  onOpenChange,
  onClose,
  templateId,
  templateName,
}: VersionHistoryPanelProps) {
  const handleClose = onClose ?? (() => onOpenChange?.(false))
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['template-versions', templateId],
    queryFn: () => getTemplateVersions(templateId!),
    enabled: open && !!templateId,
  })
  const versions = data?.versions ?? []

  const restoreMutation = useMutation({
    mutationFn: ({ versionId }: { versionId: string }) =>
      restoreTemplateVersion(templateId!, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['template', templateId] })
      queryClient.invalidateQueries({ queryKey: ['template-versions', templateId] })
      queryClient.invalidateQueries({ queryKey: ['templates-library'] })
      toast.success('Version restored')
      handleClose()
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Restore failed'),
  })

  const handleRestore = (versionId: string) => {
    restoreMutation.mutate({ versionId })
  }


  return (
    <Dialog open={open}>
      <DialogContent onClose={handleClose} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            {templateName ?? 'Template'} — {versions.length} version
            {versions.length !== 1 ? 's' : ''}
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
              {versions.map((v, idx) => (
                <div
                  key={v.id}
                  className={cn(
                    'flex items-center justify-between rounded-lg border border-border p-4 transition-colors',
                    idx === 0 && 'border-primary bg-primary/5'
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Version {v.versionNumber}</span>
                      {idx === 0 && (
                        <span className="rounded bg-primary/20 px-2 py-0.5 text-xs font-medium text-primary">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatDate(v.createdAt)}
                      {v.changesSummary && ` · ${v.changesSummary}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {idx !== 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestore(v.id)}
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
          <Button variant="outline" onClick={handleClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
