import { useState } from 'react'
import { ChevronDown, ChevronUp, Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { SearchFilters, SearchContentType } from '@/types/search'
import { useQuery } from '@tanstack/react-query'
import { getDashboardProjects } from '@/api/dashboard'

const CONTENT_TYPES: { value: SearchContentType; label: string }[] = [
  { value: 'project', label: 'Projects' },
  { value: 'decision', label: 'Decisions' },
  { value: 'template', label: 'Templates' },
  { value: 'file', label: 'Drawings & Specs' },
]

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 're_requested', label: 'Re-requested' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'completed', label: 'Completed' },
]

const DATE_PRESETS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'month', label: 'This month' },
  { value: 'custom', label: 'Custom' },
]

export interface SearchFiltersPanelProps {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
  onClear: () => void
  className?: string
}

export function SearchFiltersPanel({
  filters,
  onChange,
  onClear,
  className,
}: SearchFiltersPanelProps) {
  const [expanded, setExpanded] = useState(false)
  const [datePreset, setDatePreset] = useState('')

  const { data: projectsData } = useQuery({
    queryKey: ['dashboard-projects', { pageSize: 100 }],
    queryFn: () => getDashboardProjects({ page: 1, pageSize: 100 }),
  })
  const projects = projectsData?.items ?? []

  const hasActiveFilters =
    (filters.content_types?.length ?? 0) > 0 ||
    (filters.status?.length ?? 0) > 0 ||
    (filters.projects?.length ?? 0) > 0 ||
    (filters.dateRange?.from != null || filters.dateRange?.to != null)

  const handleContentTypeChange = (value: string) => {
    onChange({
      ...filters,
      content_types: value ? [value as SearchContentType] : undefined,
    })
  }

  const handleStatusChange = (value: string) => {
    onChange({
      ...filters,
      status: value ? [value] : undefined,
    })
  }

  const handleProjectChange = (value: string) => {
    onChange({
      ...filters,
      projects: value ? [value] : undefined,
    })
  }

  const handleDatePresetChange = (value: string) => {
    setDatePreset(value)
    if (value === 'custom' || !value) {
      return
    }
    const to = new Date()
    let from = new Date()
    if (value === '7') from.setDate(from.getDate() - 7)
    else if (value === '30') from.setDate(from.getDate() - 30)
    else if (value === '90') from.setDate(from.getDate() - 90)
    else if (value === 'month') from = new Date(from.getFullYear(), from.getMonth(), 1)
    onChange({
      ...filters,
      dateRange: {
        from: from.toISOString().slice(0, 10),
        to: to.toISOString().slice(0, 10),
      },
    })
  }

  return (
    <div className={cn('rounded-lg border border-border bg-card p-4', className)}>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-expanded={expanded}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Active
            </span>
          )}
          {expanded ? (
            <ChevronUp className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronDown className="h-4 w-4" aria-hidden />
          )}
        </button>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={onClear} aria-label="Clear all filters">
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Content type
            </label>
            <Select
              value={filters.content_types?.[0] ?? ''}
              onValueChange={handleContentTypeChange}
              options={CONTENT_TYPES}
              placeholder="All types"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Status</label>
            <Select
              value={filters.status?.[0] ?? ''}
              onValueChange={handleStatusChange}
              options={STATUS_OPTIONS}
              placeholder="All statuses"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Project</label>
            <Select
              value={filters.projects?.[0] ?? ''}
              onValueChange={handleProjectChange}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
              placeholder="All projects"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
              Date range
            </label>
            <Select
              value={datePreset}
              onValueChange={handleDatePresetChange}
              options={DATE_PRESETS}
              placeholder="Any time"
            />
          </div>
        </div>
      )}
    </div>
  )
}
