import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { getDashboardProjects } from '@/api/dashboard'
import type { TemplateLibrary, TemplateLibraryItem } from '@/types'

export interface ApplyTemplateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: TemplateLibrary | TemplateLibraryItem | null
  projectId: string | null
  onConfirm: (projectId: string) => Promise<void>
  isSubmitting?: boolean
  /** @deprecated Use isSubmitting */
  isApplying?: boolean
}

export function ApplyTemplateModal({
  open,
  onOpenChange,
  template,
  projectId,
  onConfirm,
  isSubmitting = false,
  isApplying,
}: ApplyTemplateModalProps) {
  const submitting = isSubmitting || isApplying
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)

  const { data: projectsData } = useQuery({
    queryKey: ['dashboard-projects'],
    queryFn: () => getDashboardProjects({ pageSize: 100 }),
    enabled: open,
  })

  const projects = projectsData?.items ?? []

  useEffect(() => {
    if (open) {
      setSelectedProjectId(projectId ?? projects[0]?.id ?? null)
    }
  }, [open, projectId, projects])

  const handleConfirm = async () => {
    if (!selectedProjectId) return
    await onConfirm(selectedProjectId)
    onOpenChange(false)
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply template to project</DialogTitle>
          <DialogDescription>
            {template?.name} will create a new decision with pre-filled options in the
            selected project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <label className="mb-2 block text-sm font-medium">Target project</label>
            {projects.length === 0 ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <select
                value={selectedProjectId ?? ''}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Select project"
              >
                <option value="">Select a project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            A new decision will be created in draft status with the template&apos;s
            default options. You can edit it before publishing.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedProjectId || submitting}
          >
            {submitting ? 'Applying...' : 'Apply template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
