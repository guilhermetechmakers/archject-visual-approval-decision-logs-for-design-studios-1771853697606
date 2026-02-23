import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface LibraryFilters {
  search?: string
  fileType?: string
  includeArchived?: boolean
}

export interface FiltersPanelProps {
  search: string
  onSearchChange: (value: string) => void
  fileType?: string
  onFileTypeChange?: (value: string) => void
  includeArchived?: boolean
  onIncludeArchivedChange?: (value: boolean) => void
  placeholder?: string
  className?: string
}

const FILE_TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'pdf', label: 'PDF' },
  { value: 'image', label: 'Images' },
  { value: 'dwg', label: 'DWG/CAD' },
  { value: 'doc', label: 'Documents' },
]

export function FiltersPanel({
  search,
  onSearchChange,
  fileType = '',
  onFileTypeChange,
  includeArchived = false,
  onIncludeArchivedChange,
  placeholder = 'Search files...',
  className,
}: FiltersPanelProps) {
  const hasFilters = search || fileType || includeArchived

  const clearFilters = () => {
    onSearchChange('')
    onFileTypeChange?.('')
    onIncludeArchivedChange?.(false)
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
          aria-label="Search files"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {onFileTypeChange && (
          <select
            value={fileType}
            onChange={(e) => onFileTypeChange(e.target.value)}
            className={cn(
              'flex h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm',
              'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
            )}
            aria-label="Filter by file type"
          >
            {FILE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        )}
        {onIncludeArchivedChange && (
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => onIncludeArchivedChange(e.target.checked)}
              className="h-4 w-4 rounded border-input"
            />
            <span className="text-muted-foreground">Show archived</span>
          </label>
        )}
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
