import { cn } from '@/lib/utils'

const TAGS = [
  'Getting Started',
  'Decision Logs',
  'Client Link',
  'Security',
  'Exports',
  'Billing',
  'Integrations',
]

interface HelpFiltersProps {
  selectedTags: string[]
  onTagToggle: (tag: string) => void
  sort: string
  onSortChange: (sort: string) => void
  className?: string
}

export function HelpFilters({ selectedTags, onTagToggle, sort, onSortChange, className }: HelpFiltersProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      <div className="flex flex-wrap gap-2">
        {TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onTagToggle(tag)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              selectedTags.includes(tag)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            )}
          >
            {tag}
          </button>
        ))}
      </div>
      <select
        value={sort}
        onChange={(e) => onSortChange(e.target.value)}
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        aria-label="Sort by"
      >
        <option value="updated_at">Latest updated</option>
        <option value="created_at">Newest first</option>
        <option value="title">Title A–Z</option>
      </select>
    </div>
  )
}
