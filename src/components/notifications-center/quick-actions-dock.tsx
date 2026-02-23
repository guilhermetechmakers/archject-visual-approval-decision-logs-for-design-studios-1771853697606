import { Link } from 'react-router-dom'
import { Plus, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface QuickActionsDockProps {
  relatedProjectId?: string | null
  relatedDecisionId?: string | null
  className?: string
}

export function QuickActionsDock({
  relatedProjectId,
  relatedDecisionId,
  className,
}: QuickActionsDockProps) {
  const createDecisionHref = relatedProjectId
    ? `/dashboard/projects/${relatedProjectId}/decisions/new`
    : '/dashboard/projects'

  const replyHref =
    relatedProjectId && relatedDecisionId
      ? `/dashboard/projects/${relatedProjectId}/decisions/${relatedDecisionId}`
      : undefined

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 rounded-lg border border-border bg-muted/30 p-3',
        className
      )}
      role="group"
      aria-label="Quick actions"
    >
      <Link
        to={createDecisionHref}
        className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
      >
        <Plus className="mr-2 h-4 w-4" />
        New decision
      </Link>
      {replyHref && (
        <Link
          to={replyHref}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium hover:bg-muted"
        >
          <MessageSquare className="mr-2 h-4 w-4" />
          Reply / View
        </Link>
      )}
    </div>
  )
}
