import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProject } from '@/api/dashboard'

const schema = z.object({
  name: z.string().min(1, 'Project name is required').max(200, 'Name is too long'),
})

type FormData = z.infer<typeof schema>

export interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CreateProjectModal({
  open,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  const mutation = useMutation({
    mutationFn: (name: string) => createProject(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
      toast.success('Project created successfully')
      reset()
      onClose()
      onSuccess?.()
    },
    onError: (err: { message?: string }) => {
      toast.error(err?.message ?? 'Failed to create project')
      setIsSubmitting(false)
    },
  })

  const onSubmit = (data: FormData) => {
    setIsSubmitting(true)
    mutation.mutate(data.name, {
      onSettled: () => setIsSubmitting(false),
    })
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Create Project</DialogTitle>
          <DialogDescription>
            Add a new project to organize your decisions and approvals.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                placeholder="e.g. Riverside Residence"
                {...register('name')}
                className={errors.name ? 'border-destructive' : ''}
                autoFocus
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || mutation.isPending}>
              {mutation.isPending ? 'Creating...' : 'Create Project'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
