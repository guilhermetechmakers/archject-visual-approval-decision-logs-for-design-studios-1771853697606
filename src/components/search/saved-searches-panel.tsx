import { Bookmark, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SavedSearch, SearchQueryPayload } from '@/types/search'

export interface SavedSearchesPanelProps {
  items: SavedSearch[]
  onSelect: (payload: SearchQueryPayload) => void
  onSaveCurrent?: () => void
  canSave?: boolean
  className?: string
}

export function SavedSearchesPanel({
  items,
  onSelect,
  onSaveCurrent,
  canSave = true,
  className,
}: SavedSearchesPanelProps) {
  if (items.length === 0 && !canSave) return null

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">Saved searches</h3>
        {canSave && onSaveCurrent && (
          <Button variant="ghost" size="sm" onClick={onSaveCurrent} aria-label="Save current search">
            <Plus className="mr-1 h-4 w-4" />
            Save
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No saved searches yet. Apply filters and save to quickly recall later.
        </p>
      ) : (
        <ul className="mt-2 space-y-1" role="list">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.payload)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-foreground hover:bg-muted focus:bg-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <Bookmark className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{item.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
