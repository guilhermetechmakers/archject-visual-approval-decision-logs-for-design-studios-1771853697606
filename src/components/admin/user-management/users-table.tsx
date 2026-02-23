import { useRef, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronUp, ChevronDown } from 'lucide-react'
import { StatusBadge } from './status-badge'
import { RolePill } from './role-pill'
import { AdminActionsMenu } from './admin-actions-menu'
import type { AdminUser } from '@/api/admin'

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return d.toLocaleDateString()
}

interface UsersTableProps {
  users: AdminUser[]
  total: number
  page: number
  perPage: number
  sortBy: string
  sortDir: string
  selectedIds: Set<string>
  onSelectAll: (checked: boolean) => void
  onSelectOne: (id: string, checked: boolean) => void
  onSort: (sortBy: string, sortDir: string) => void
  onUserClick: (user: AdminUser) => void
  onSuspend: (user: AdminUser) => void
  onReactivate: (user: AdminUser) => void
  onChangeRole: (user: AdminUser) => void
  onImpersonate?: (user: AdminUser) => void
  isLoading?: boolean
  canImpersonate?: boolean
}

export function UsersTable({
  users,
  total,
  page,
  perPage,
  sortBy,
  sortDir,
  selectedIds,
  onSelectAll,
  onSelectOne,
  onSort,
  onUserClick,
  onSuspend,
  onReactivate,
  onChangeRole,
  onImpersonate,
  isLoading,
  canImpersonate = false,
}: UsersTableProps) {
  const allSelected = users.length > 0 && users.every((u) => selectedIds.has(u.id))
  const someSelected = users.some((u) => selectedIds.has(u.id))
  const selectAllRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected && !allSelected
    }
  }, [someSelected, allSelected])

  const SortHeader = ({ col, label }: { col: string; label: string }) => {
    const isActive = sortBy === col
    return (
      <button
        type="button"
        className="flex items-center gap-1 font-medium hover:text-foreground"
        onClick={() => onSort(col, isActive && sortDir === 'desc' ? 'asc' : 'desc')}
      >
        {label}
        {isActive ? sortDir === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" /> : null}
      </button>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16">
        <p className="font-medium">No users found</p>
        <p className="mt-1 text-sm text-muted-foreground">Try adjusting your search or filters</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox
                ref={selectAllRef}
                checked={allSelected}
                onCheckedChange={(c) => onSelectAll(!!c)}
                aria-label="Select all"
              />
            </TableHead>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Studio(s)</TableHead>
            <TableHead>
              <SortHeader col="lastLogin" label="Last login" />
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>
              <SortHeader col="createdAt" label="Created" />
            </TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              className="transition-colors hover:bg-muted/50 cursor-pointer"
              onClick={() => onUserClick(user)}
            >
              <TableCell onClick={(e) => e.stopPropagation()}>
                <Checkbox
                  checked={selectedIds.has(user.id)}
                  onCheckedChange={(c) => onSelectOne(user.id, !!c)}
                  aria-label={`Select ${user.name}`}
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                    {(user.name || user.email).charAt(0).toUpperCase()}
                  </div>
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline text-left"
                    onClick={(e) => {
                      e.stopPropagation()
                      onUserClick(user)
                    }}
                  >
                    {user.name || user.email}
                  </button>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell>
                <RolePill role={user.role} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {user.studios?.map((s) => s.name).join(', ') || user.studioId || '—'}
              </TableCell>
              <TableCell className="text-muted-foreground" title={user.lastLoginAt || undefined}>
                {formatRelativeTime(user.lastLoginAt)}
              </TableCell>
              <TableCell>
                <StatusBadge status={user.status as 'active' | 'suspended' | 'invited'} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <AdminActionsMenu
                  user={user}
                  onView={() => onUserClick(user)}
                  onImpersonate={onImpersonate ? () => onImpersonate(user) : undefined}
                  onChangeRole={() => onChangeRole(user)}
                  onSuspend={() => onSuspend(user)}
                  onReactivate={() => onReactivate(user)}
                  canImpersonate={canImpersonate}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {total > perPage && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / perPage)} ({total} total)
          </p>
        </div>
      )}
    </div>
  )
}
