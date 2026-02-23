import { Link } from 'react-router-dom'
import {
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Download,
  CheckSquare,
  Square,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SlowDecision } from '@/api/analytics'

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)}h`
  return `${(seconds / 86400).toFixed(1)}d`
}

const STATUS_VARIANTS: Record<string, 'success' | 'warning' | 'secondary' | 'destructive'> = {
  approved: 'success',
  declined: 'destructive',
  pending: 'warning',
  in_review: 'warning',
  re_requested: 'secondary',
}

interface SlowDecisionsTableProps {
  decisions: SlowDecision[]
  total: number
  page: number
  limit: number
  isLoading?: boolean
  projectId?: string
  onPageChange?: (page: number) => void
  onSort?: (sort: string, sortDir: string) => void
  sort?: string
  sortDir?: string
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  onExportSelected?: (ids: string[]) => void
}

export function SlowDecisionsTable({
  decisions,
  total,
  page,
  limit,
  isLoading,
  projectId,
  onPageChange,
  onSort,
  sort = 'created_at',
  sortDir = 'desc',
  selectedIds = new Set(),
  onSelectionChange,
  onExportSelected,
}: SlowDecisionsTableProps) {
  const pages = Math.ceil(total / limit)
  const allSelected = decisions.length > 0 && decisions.every((d) => selectedIds.has(d.id))
  const someSelected = selectedIds.size > 0

  const toggleAll = () => {
    if (!onSelectionChange) return
    if (allSelected) {
      const next = new Set(selectedIds)
      decisions.forEach((d) => next.delete(d.id))
      onSelectionChange(next)
    } else {
      const next = new Set(selectedIds)
      decisions.forEach((d) => next.add(d.id))
      onSelectionChange(next)
    }
  }

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    onSelectionChange(next)
  }

  const handleSort = (col: string) => {
    if (!onSort) return
    onSort(col, sort === col && sortDir === 'desc' ? 'asc' : 'desc')
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sort !== column) return null
    return sortDir === 'asc' ? (
      <ChevronUp className="ml-1 inline h-4 w-4" />
    ) : (
      <ChevronDown className="ml-1 inline h-4 w-4" />
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="font-semibold">Top Slow Decisions</h3>
        {someSelected && onExportSelected && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onExportSelected(Array.from(selectedIds))}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Selected ({selectedIds.size})
          </Button>
        )}
      </div>
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="p-4">
            <Skeleton className="h-64 w-full" />
          </div>
        ) : decisions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-medium">No decisions found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Adjust filters or date range to see decisions
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {onSelectionChange && (
                  <TableHead className="w-12">
                    <button
                      type="button"
                      onClick={toggleAll}
                      className="focus:outline-none focus:ring-2 focus:ring-ring"
                      aria-label={allSelected ? 'Deselect all' : 'Select all'}
                    >
                      {allSelected ? (
                        <CheckSquare className="h-4 w-4 text-primary" />
                      ) : (
                        <Square className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </TableHead>
                )}
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort('id')}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Decision ID
                    <SortIcon column="id" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort('title')}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Title
                    <SortIcon column="title" />
                  </button>
                </TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort('created_at')}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Created
                    <SortIcon column="created_at" />
                  </button>
                </TableHead>
                <TableHead>
                  <button
                    type="button"
                    onClick={() => handleSort('timeToDecision')}
                    className="flex items-center font-medium hover:text-foreground"
                  >
                    Time to Decision
                    <SortIcon column="timeToDecision" />
                  </button>
                </TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {decisions.map((d) => {
                const projId = projectId || d.projectId
                return (
                  <TableRow
                    key={d.id}
                    className={cn(
                      'transition-colors hover:bg-muted/50',
                      selectedIds.has(d.id) && 'border-l-4 border-l-primary bg-primary/5'
                    )}
                  >
                    {onSelectionChange && (
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => toggleOne(d.id)}
                          className="focus:outline-none focus:ring-2 focus:ring-ring"
                          aria-label={selectedIds.has(d.id) ? 'Deselect' : 'Select'}
                        >
                          {selectedIds.has(d.id) ? (
                            <CheckSquare className="h-4 w-4 text-primary" />
                          ) : (
                            <Square className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </TableCell>
                    )}
                    <TableCell className="font-mono text-xs">{d.id.slice(0, 8)}...</TableCell>
                    <TableCell className="max-w-[200px] truncate font-medium">{d.title}</TableCell>
                    <TableCell className="text-muted-foreground">{d.projectName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {d.reviewerId ? d.reviewerId.slice(0, 8) + '...' : '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(d.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {d.timeToDecisionSeconds != null
                        ? formatDuration(d.timeToDecisionSeconds)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[d.status] || 'secondary'}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Link
                        to={`/dashboard/projects/${projId}/decisions/${d.id}`}
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        View
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>
      {pages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Page {page} of {pages} ({total} total)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= pages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
