import { useParams } from 'react-router-dom'
import { CreateDecisionWizard } from '@/components/create-decision'

export function CreateDecisionPage() {
  const { projectId } = useParams<{ projectId: string }>()

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-muted-foreground">Project not found</p>
      </div>
    )
  }

  return <CreateDecisionWizard projectId={projectId} />
}
