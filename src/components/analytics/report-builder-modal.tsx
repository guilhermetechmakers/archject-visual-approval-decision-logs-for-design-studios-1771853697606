import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Download, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, type SelectOption } from '@/components/ui/select'
import { toast } from 'sonner'
import { analyticsApi } from '@/api/analytics'

const schema = z.object({
  scope: z.enum(['project', 'account']),
  projectId: z.string().optional(),
  groupBy: z.string(),
  format: z.enum(['csv', 'json']),
})

type FormValues = z.infer<typeof schema>

interface ReportBuilderModalProps {
  open: boolean
  onClose: () => void
  projectId?: string
  projects: { id: string; name: string }[]
  preselectedDecisionIds?: string[]
  onExportComplete?: () => void
}

export function ReportBuilderModal({
  open,
  onClose,
  projectId,
  projects,
  preselectedDecisionIds,
  onExportComplete,
}: ReportBuilderModalProps) {

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      scope: 'project',
      projectId: projectId || '',
      groupBy: 'reviewer',
      format: 'csv',
    },
  })

  const scope = watch('scope')
  const selectedProjectId = watch('projectId')

  const projectOptions: SelectOption[] = [
    { value: '', label: 'Select project' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ]

  const onSubmit = async (data: FormValues) => {
    const projId = data.projectId || projectId
    if (!projId) {
      toast.error('Please select a project')
      return
    }

    try {
      await analyticsApi.createExport(
        { projectId: projId },
        {
          groupBy: data.groupBy,
          template: data.groupBy,
          decisionIds: preselectedDecisionIds,
        },
        data.format
      )
      toast.success('Export queued. You can download it when ready.')
      onClose()
      onExportComplete?.()
    } catch (e) {
      toast.error((e as { message?: string })?.message || 'Failed to create export')
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={onClose} className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Custom Report Builder</DialogTitle>
          <DialogDescription>
            Configure filters and export format. Exports are processed asynchronously.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Scope</label>
            <select
              {...register('scope')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="project">Project</option>
              <option value="account">Account</option>
            </select>
          </div>

          {scope === 'project' && (
            <div>
              <label className="mb-1 block text-sm font-medium">Project</label>
              <Select
                options={projectOptions}
                value={selectedProjectId || projectId || ''}
                onValueChange={(v) => setValue('projectId', v)}
                placeholder="Select project"
              />
              {errors.projectId && (
                <p className="mt-1 text-sm text-destructive">{errors.projectId.message}</p>
              )}
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Group by</label>
            <select
              {...register('groupBy')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="reviewer">Reviewer</option>
              <option value="decision_type">Decision Type</option>
              <option value="status">Status</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Format</label>
            <select
              {...register('format')}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
          </div>

          {preselectedDecisionIds && preselectedDecisionIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {preselectedDecisionIds.length} decision(s) selected for export
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
