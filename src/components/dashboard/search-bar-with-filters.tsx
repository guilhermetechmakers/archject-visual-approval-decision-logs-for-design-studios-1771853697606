import { useState, useCallback } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface DashboardFilters {
  search?: string
  status?: string
  dateRange?: string
}

export interface SearchBarWithFiltersProps {
  value?: string
  onSearch?: (value: string) => void
  onFiltersChange?: (filters: DashboardFilters) => void
  placeholder?: string
  className?: string
}

export function SearchBarWithFilters({
  value: controlledValue,
  onSearch,
  onFiltersChange,
  placeholder = 'Search projects, decisions, templates...',
  className,
}: SearchBarWithFiltersProps) {
  const [localValue, setLocalValue] = useState(controlledValue ?? '')
  const value = controlledValue ?? localValue

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value
      setLocalValue(v)
      onSearch?.(v)
      onFiltersChange?.({ search: v || undefined })
    },
    [onSearch, onFiltersChange]
  )

  return (
    <div className={cn('relative', className)}>
      <Search
        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <Input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="pl-9 pr-4"
        aria-label="Search"
      />
    </div>
  )
}
