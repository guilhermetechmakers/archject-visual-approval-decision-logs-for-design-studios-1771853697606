import { Check, X, FilterX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

export interface BulkActionsBarProps {
  selectedIds: string[]
  onMarkRead: () => void
  onMarkUnread: () => void
  onMute?: (projectId: string) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
  isLoading?: boolean
  className?: string
}

export function BulkActionsBar({
  selectedIds,
  onMarkRead,
  onMarkUnread,
  onClearFilters,
  hasActiveFilters,
  isLoading,
  className,
}: BulkActionsBarProps) {
  const hasSelection = selectedIds.length > 0

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card px-4 py-2',
        className
      )}
      role="toolbar"
      aria-label="Bulk actions"
    >
      <Button
        variant="outline"
        size="sm"
        onClick={onMarkRead}
        disabled={isLoading}
        className="gap-1.5"
        aria-label={hasSelection ? 'Mark selected as read' : 'Mark all as read'}
      >
        <Check className="h-4 w-4" />
        Mark Read
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onMarkUnread}
        disabled={!hasSelection}
        className="gap-1.5"
        aria-label="Mark as unread"
      >
        <X className="h-4 w-4" />
        Mark Unread
      </Button>
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          disabled={isLoading}
          className="gap-1.5 text-muted-foreground"
          aria-label="Clear filters"
        >
          <FilterX className="h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
