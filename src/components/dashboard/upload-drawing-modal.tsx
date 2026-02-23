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

export interface UploadDrawingModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

interface ProjectOption {
  id: string
  name: string
}

export function UploadDrawingModal({
  open,
  onClose,
  onSuccess,
}: UploadDrawingModalProps) {
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

  const handleContinue = () => {
    if (!projectId) return
    onClose()
    onSuccess?.()
    navigate(`/dashboard/projects/${projectId}/library`)
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={onClose}>
        <DialogHeader>
          <DialogTitle>Upload Drawing</DialogTitle>
          <DialogDescription>
            Select a project to add drawings and specifications to its library.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="upload-project">Project</Label>
            <Select
              id="upload-project"
              options={projectOptions}
              value={projectId}
              onValueChange={setProjectId}
              placeholder="Select project"
              disabled={isLoading}
            />
            {projects.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">
                Create a project first to upload drawings.
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
            onClick={handleContinue}
            disabled={isLoading || projects.length === 0 || !projectId}
          >
            Go to Project Library
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
