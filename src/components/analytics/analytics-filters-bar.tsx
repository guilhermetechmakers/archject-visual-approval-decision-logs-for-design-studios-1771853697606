import { useState } from 'react'
import { Calendar, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, type SelectOption } from '@/components/ui/select'
import { cn } from '@/lib/utils'

const DATE_PRESETS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: 'custom', label: 'Custom range' },
] as const

const DECISION_TYPES: SelectOption[] = [
  { value: '', label: 'All types' },
  { value: 'finishes', label: 'Finishes' },
  { value: 'layout', label: 'Layout' },
  { value: 'change_request', label: 'Change Request' },
  { value: 'other', label: 'Other' },
]

const STATUS_OPTIONS: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_review', label: 'In Review' },
  { value: 're_requested', label: 'Re-requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
]

export interface AnalyticsFilters {
  datePreset: string
  start: string
  end: string
  projectId: string
  decisionType: string
  status: string
  search: string
  slaOverlay: boolean
}

interface AnalyticsFiltersBarProps {
  filters: AnalyticsFilters
  onFiltersChange: (filters: AnalyticsFilters) => void
  projects: { id: string; name: string }[]
  className?: string
}

export function AnalyticsFiltersBar({
  filters,
  onFiltersChange,
  projects,
  className,
}: AnalyticsFiltersBarProps) {
  const [showCustomRange, setShowCustomRange] = useState(filters.datePreset === 'custom')

  const projectOptions: SelectOption[] = [
    { value: '', label: 'All projects' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ]

  const handlePresetChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomRange(true)
      onFiltersChange({ ...filters, datePreset: value })
      return
    }
    setShowCustomRange(false)
    const days = parseInt(value, 10)
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - days)
    onFiltersChange({
      ...filters,
      datePreset: value,
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    })
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-card transition-shadow duration-200 hover:shadow-card-hover',
        className
      )}
      role="search"
      aria-label="Analytics filters"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden />
          <select
            value={filters.datePreset}
            onChange={(e) => handlePresetChange(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Date range"
          >
            {DATE_PRESETS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        {showCustomRange && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filters.start}
              onChange={(e) => onFiltersChange({ ...filters, start: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="Start date"
            />
            <span className="text-muted-foreground">to</span>
            <input
              type="date"
              value={filters.end}
              onChange={(e) => onFiltersChange({ ...filters, end: e.target.value })}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              aria-label="End date"
            />
          </div>
        )}

        <Select
          options={projectOptions}
          value={filters.projectId}
          onValueChange={(v) => onFiltersChange({ ...filters, projectId: v })}
          placeholder="Select project"
          className="w-48"
        />

        <Select
          options={DECISION_TYPES}
          value={filters.decisionType}
          onValueChange={(v) => onFiltersChange({ ...filters, decisionType: v })}
          placeholder="Decision type"
          className="w-40"
        />

        <Select
          options={STATUS_OPTIONS}
          value={filters.status}
          onValueChange={(v) => onFiltersChange({ ...filters, status: v })}
          placeholder="Status"
          className="w-36"
        />

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={filters.slaOverlay}
            onChange={(e) => onFiltersChange({ ...filters, slaOverlay: e.target.checked })}
            className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
          />
          <span className="text-sm">SLA overlay</span>
        </label>

        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search decisions..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            className="pl-9 w-56"
            aria-label="Search decisions"
          />
        </div>
      </div>
    </div>
  )
}
