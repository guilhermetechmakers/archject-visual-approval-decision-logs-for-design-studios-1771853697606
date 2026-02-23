import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, type SelectOption } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

const TEMPLATE_TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All types' },
  { value: 'FINISHES', label: 'Finishes' },
  { value: 'LAYOUTS', label: 'Layouts' },
  { value: 'CHANGE_REQUESTS', label: 'Change Requests' },
  { value: 'VARIATIONS', label: 'Variations' },
  { value: 'PERMITS', label: 'Permits' },
]

export interface TemplatesFiltersBarProps {
  search: string
  onSearchChange: (value: string) => void
  type: string
  onTypeChange: (value: string) => void
  includeArchived?: boolean
  onIncludeArchivedChange?: (value: boolean) => void
  archived?: boolean
  onArchivedChange?: (value: boolean) => void
  scope: 'my' | 'all'
  onScopeChange: (value: 'my' | 'all') => void
  placeholder?: string
  className?: string
}

export function TemplatesFiltersBar({
  search,
  onSearchChange,
  type,
  onTypeChange,
  includeArchived = false,
  onIncludeArchivedChange,
  archived = false,
  onArchivedChange,
  scope,
  onScopeChange,
  placeholder = 'Search templates by name, tags...',
  className,
}: TemplatesFiltersBarProps) {
  const isArchived = onArchivedChange ? archived : includeArchived
  const setArchived = onArchivedChange ?? onIncludeArchivedChange
  const hasFilters = search || type || isArchived

  const clearFilters = () => {
    onSearchChange('')
    onTypeChange('')
    setArchived?.(false)
  }

  return (
    <div className={cn('flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4', className)}>
      <div className="relative flex-1">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-4"
          aria-label="Search templates"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => onScopeChange('all')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              scope === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-pressed={scope === 'all'}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onScopeChange('my')}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              scope === 'my'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            aria-pressed={scope === 'my'}
          >
            My Templates
          </button>
        </div>
        <Select
          value={type}
          onValueChange={onTypeChange}
          options={TEMPLATE_TYPE_OPTIONS}
          placeholder="Type"
          className="w-[160px]"
          aria-label="Filter by type"
        />
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={isArchived}
            onCheckedChange={(checked) => setArchived?.(!!checked)}
            aria-label="Show archived"
          />
          <span className="text-muted-foreground">Show archived</span>
        </label>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-muted-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
