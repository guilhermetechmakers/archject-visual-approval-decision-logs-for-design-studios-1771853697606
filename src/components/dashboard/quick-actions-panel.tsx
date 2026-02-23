import { useState } from 'react'
import { Plus, FileCheck, Upload, LayoutTemplate } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { CreateProjectModal } from './create-project-modal'
import { CreateDecisionModal } from './create-decision-modal'
import { UploadDrawingModal } from './upload-drawing-modal'

export interface QuickActionsPanelProps {
  onActionComplete?: () => void
  /** When provided, Create Project uses this instead of internal modal */
  onCreateProjectOpen?: () => void
  className?: string
}

const actions = [
  {
    id: 'create-project',
    label: 'Create Project',
    icon: Plus,
    color: 'bg-primary/10 text-primary',
  },
  {
    id: 'create-decision',
    label: 'Create Decision',
    icon: FileCheck,
    color: 'bg-success/10 text-success',
  },
  {
    id: 'upload-drawing',
    label: 'Upload Drawing',
    icon: Upload,
    color: 'bg-warning/10 text-warning',
  },
  {
    id: 'import-template',
    label: 'Import Template',
    icon: LayoutTemplate,
    color: 'bg-primary/10 text-primary',
  },
] as const

export function QuickActionsPanel({
  onActionComplete,
  onCreateProjectOpen,
  className,
}: QuickActionsPanelProps) {
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const [createDecisionOpen, setCreateDecisionOpen] = useState(false)
  const [uploadDrawingOpen, setUploadDrawingOpen] = useState(false)

  const handleAction = (id: string) => {
    switch (id) {
      case 'create-project':
        if (onCreateProjectOpen) {
          onCreateProjectOpen()
        } else {
          setCreateProjectOpen(true)
        }
        break
      case 'create-decision':
        setCreateDecisionOpen(true)
        break
      case 'upload-drawing':
        setUploadDrawingOpen(true)
        break
      case 'import-template':
        window.location.href = '/dashboard/templates'
        break
      default:
        break
    }
  }

  const handleComplete = () => {
    onActionComplete?.()
    setCreateProjectOpen(false)
    setCreateDecisionOpen(false)
    setUploadDrawingOpen(false)
  }

  return (
    <>
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started quickly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={() => handleAction(action.id)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-xl border border-border p-4 transition-all duration-200',
                  'hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                )}
              >
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-lg',
                    action.color
                  )}
                >
                  <action.icon className="h-5 w-5" />
                </div>
                <span className="text-center text-sm font-medium">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {!onCreateProjectOpen && (
        <CreateProjectModal
          open={createProjectOpen}
          onClose={() => setCreateProjectOpen(false)}
          onSuccess={handleComplete}
        />
      )}
      <CreateDecisionModal
        open={createDecisionOpen}
        onClose={() => setCreateDecisionOpen(false)}
        onSuccess={handleComplete}
      />
      <UploadDrawingModal
        open={uploadDrawingOpen}
        onClose={() => setUploadDrawingOpen(false)}
        onSuccess={handleComplete}
      />
    </>
  )
}
