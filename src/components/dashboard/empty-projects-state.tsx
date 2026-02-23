import { FolderKanban } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface EmptyProjectsStateProps {
  onCreateClick?: () => void
  className?: string
}

export function EmptyProjectsState({
  onCreateClick,
  className,
}: EmptyProjectsStateProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <FolderKanban className="h-16 w-16 text-muted-foreground" />
        <p className="mt-4 text-lg font-medium">No projects yet</p>
        <p className="mt-2 max-w-md text-center text-muted-foreground">
          Create your first project to start managing decisions and approvals.
        </p>
        <Button className="mt-6" onClick={onCreateClick}>
          Create project
        </Button>
      </CardContent>
    </Card>
  )
}
