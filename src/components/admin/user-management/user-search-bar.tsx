import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, type SelectOption } from '@/components/ui/select'
import { cn } from '@/lib/utils'

export interface UserSearchFilters {
  q: string
  status: string
  role: string
  sortBy: string
  sortDir: string
}

interface UserSearchBarProps {
  filters: UserSearchFilters
  onFiltersChange: (f: Partial<UserSearchFilters>) => void
  onSearch: () => void
  className?: string
}

const statusOptions: SelectOption[] = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'invited', label: 'Invited' },
]

const roleOptions: SelectOption[] = [
  { value: '', label: 'All roles' },
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'reviewer', label: 'Reviewer' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'member', label: 'Member' },
]

const sortOptions: SelectOption[] = [
  { value: 'createdAt', label: 'Created date' },
  { value: 'name', label: 'Name' },
  { value: 'lastLogin', label: 'Last login' },
]

export function UserSearchBar({ filters, onFiltersChange, onSearch, className }: UserSearchBarProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search users by name or email..."
            className="pl-9 w-full"
            value={filters.q}
            onChange={(e) => onFiltersChange({ q: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onSearch()}
            aria-label="Search users"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="w-[140px]">
            <Select
              options={statusOptions}
              value={filters.status}
              onValueChange={(v) => onFiltersChange({ status: v })}
              placeholder="Status"
            />
          </div>
          <div className="w-[130px]">
            <Select
              options={roleOptions}
              value={filters.role}
              onValueChange={(v) => onFiltersChange({ role: v })}
              placeholder="Role"
            />
          </div>
          <div className="w-[140px]">
            <Select
              options={sortOptions}
              value={filters.sortBy}
              onValueChange={(v) => onFiltersChange({ sortBy: v })}
              placeholder="Sort by"
            />
          </div>
          <select
            value={filters.sortDir}
            onChange={(e) => onFiltersChange({ sortDir: e.target.value })}
            className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            aria-label="Sort direction"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
          <Button size="sm" onClick={onSearch}>
            Search
          </Button>
        </div>
      </div>
    </div>
  )
}
