import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { NotificationType } from '@/types'

const FILTER_OPTIONS: { value: '' | NotificationType; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'approval', label: 'Approval' },
  { value: 'comment', label: 'Comment' },
  { value: 'export', label: 'Export' },
]

export interface FiltersBarProps {
  typeFilter: '' | NotificationType
  onTypeFilterChange: (type: '' | NotificationType) => void
  readStatusFilter?: 'all' | 'read' | 'unread'
  onReadStatusFilterChange?: (status: 'all' | 'read' | 'unread') => void
  hasFilters?: boolean
  onClearFilters?: () => void
  className?: string
}

export function FiltersBar({
  typeFilter,
  onTypeFilterChange,
  readStatusFilter = 'all',
  onReadStatusFilterChange,
  hasFilters,
  onClearFilters,
  className,
}: FiltersBarProps) {
  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4', className)} role="group" aria-label="Filter notifications">
      <div className="flex flex-wrap gap-2">
        <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value || 'all'}
              type="button"
              onClick={() => onTypeFilterChange(opt.value)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-all duration-200',
                'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                typeFilter === opt.value
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
              aria-pressed={typeFilter === opt.value}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {onReadStatusFilterChange && (
          <div className="flex gap-1 rounded-lg border border-border p-1">
            {(['all', 'unread', 'read'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => onReadStatusFilterChange(status)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  readStatusFilter === status
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                aria-pressed={readStatusFilter === status}
              >
                {status === 'all' ? 'All' : status === 'unread' ? 'Unread' : 'Read'}
              </button>
            ))}
          </div>
        )}
        {hasFilters && onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Clear filters"
          >
            <X className="h-4 w-4" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  )
}
