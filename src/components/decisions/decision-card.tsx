import { Link, useNavigate } from 'react-router-dom'
import {
  Share2,
  Download,
  Check,
  ChevronRight,
  MoreHorizontal,
  CopyPlus,
  Archive,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { Decision } from '@/types'

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: 'medium',
    })
  } catch {
    return iso
  }
}

function statusVariant(
  status: Decision['status']
): 'success' | 'warning' | 'secondary' | 'destructive' {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'destructive'
  if (status === 'pending' || status === 'in_review') return 'warning'
  return 'secondary'
}

export interface DecisionCardProps {
  decision: Decision
  projectId: string
  /** Optional: show compact layout for list views */
  compact?: boolean
  /** Optional: show action buttons */
  showActions?: boolean
  /** Optional: custom class name */
  className?: string
  /** Optional: base path for links (default: /dashboard) */
  basePath?: string
  /** Optional: clone handler */
  onClone?: (decisionId: string) => void
  /** Optional: archive handler */
  onArchive?: (decisionId: string) => void
  /** Optional: days since creation */
  daysOpen?: number
  /** Optional: whether past due date */
  isOverdue?: boolean
}

export function DecisionCard({
  decision,
  projectId,
  compact = false,
  showActions = true,
  className,
  basePath = '/dashboard',
  onClone,
  onArchive,
  daysOpen,
  isOverdue,
}: DecisionCardProps) {
  const navigate = useNavigate()
  const detailPath = `${basePath}/projects/${projectId}/decisions/${decision.id}`
  const approvedOption = decision.options.find(
    (o) => o.id === decision.approvedOptionId || o.selected
  )
  const thumbnailUrl = approvedOption?.imageUrl ?? decision.options[0]?.imageUrl

  return (
    <Card
      className={cn(
        'group transition-all duration-200 card-hover',
        'border-border bg-card hover:border-primary/30',
        compact && 'overflow-hidden',
        className
      )}
    >
      <Link
        to={detailPath}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
        aria-label={`View decision: ${decision.title}`}
      >
        {/* Media / thumbnail */}
        <div
          className={cn(
            'relative overflow-hidden bg-muted',
            compact ? 'aspect-[16/9]' : 'aspect-video'
          )}
        >
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <span className="text-sm">No preview</span>
            </div>
          )}
          {approvedOption && (
            <div
              className="absolute right-2 top-2 rounded-full bg-success p-1 shadow-sm"
              aria-hidden
            >
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
          <h3 className="text-base font-semibold line-clamp-2">{decision.title}</h3>
          <Badge
            variant={statusVariant(decision.status)}
            className="shrink-0"
          >
            {String(decision.status).replace(/_/g, ' ')}
          </Badge>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-2">
            {decision.options.slice(0, 3).map((opt) => (
              <span
                key={opt.id}
                className={cn(
                  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs',
                  opt.id === approvedOption?.id
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                )}
              >
                {opt.id === approvedOption?.id && (
                  <Check className="h-3 w-3" aria-hidden />
                )}
                {opt.label}
              </span>
            ))}
            {decision.options.length > 3 && (
              <span className="text-xs text-muted-foreground">
                +{decision.options.length - 3} more
              </span>
            )}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Updated {formatDate(decision.updatedAt)}</span>
            {(daysOpen !== undefined || isOverdue) && (
              <span
                className={cn(
                  'shrink-0 rounded px-1.5 py-0.5',
                  isOverdue ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'
                )}
              >
                {isOverdue ? 'Overdue' : daysOpen !== undefined && daysOpen > 0 ? `${daysOpen}d open` : null}
              </span>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
          </div>
        </CardContent>
      </Link>

      {showActions && (
        <div
          className="flex items-center gap-1 border-t border-border px-4 py-2"
          role="group"
          aria-label="Decision actions"
        >
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => navigate(detailPath)}
          >
            <Share2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs"
            onClick={() => navigate('/dashboard/exports')}
          >
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            Export
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="ml-auto h-8 w-8"
                aria-label="More actions for this decision"
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(detailPath)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/dashboard/exports')}>
                Export decision log
              </DropdownMenuItem>
              {onClone && (
                <DropdownMenuItem onClick={() => onClone(decision.id)}>
                  <CopyPlus className="mr-2 h-4 w-4" />
                  Clone
                </DropdownMenuItem>
              )}
              {onArchive && (
                <DropdownMenuItem
                  onClick={() => onArchive(decision.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </Card>
  )
}
