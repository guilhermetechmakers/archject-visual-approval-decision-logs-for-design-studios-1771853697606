import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { api } from '@/lib/api'

export interface CreateDecisionModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ProjectOption {
  id: string
  name: string
}

export function CreateDecisionModal({
  open,
  onClose,
  onSuccess,
}: CreateDecisionModalProps) {
  const navigate = useNavigate()
  const [projectId, setProjectId] = useState('')
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get<{ projects: ProjectOption[] }>('/projects')
      return res.projects ?? []
    },
    enabled: open,
  })

  const projects = data ?? []
  const projectOptions = projects.map((p) => ({ value: p.id, label: p.name }))

  const handleCreate = () => {
    if (!projectId) return
    onClose()
    onSuccess?.()
    navigate(`/dashboard/projects/${projectId}/decisions/new`)
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Create Decision</DialogTitle>
          <DialogDescription>
            Select a project to add a new decision to.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select
              id="project"
              options={projectOptions}
              value={projectId}
              onValueChange={setProjectId}
              placeholder="Select project"
              disabled={isLoading}
            />
            {projects.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">
                Create a project first to add decisions.
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={isLoading || projects.length === 0 || !projectId}
          >
            Continue to Create Decision
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
