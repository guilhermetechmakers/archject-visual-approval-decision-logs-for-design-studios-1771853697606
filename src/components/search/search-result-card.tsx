import { Link } from 'react-router-dom'
import {
  FolderKanban,
  FileCheck,
  LayoutTemplate,
  FileStack,
  ExternalLink,
  Paperclip,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { SearchResultItem, SearchContentType } from '@/types/search'

const TYPE_ICONS: Record<SearchContentType, React.ComponentType<{ className?: string }>> = {
  project: FolderKanban,
  decision: FileCheck,
  template: LayoutTemplate,
  file: FileStack,
}

const TYPE_LABELS: Record<SearchContentType, string> = {
  project: 'Project',
  decision: 'Decision',
  template: 'Template',
  file: 'Drawing',
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  approved: 'success',
  completed: 'success',
  published: 'success',
  pending: 'warning',
  in_review: 'warning',
  declined: 'destructive',
  re_requested: 'secondary',
  draft: 'secondary',
}

function getStatusVariant(status: string | null): 'default' | 'success' | 'warning' | 'destructive' | 'secondary' {
  if (!status) return 'default'
  return STATUS_VARIANTS[status] ?? 'default'
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

function getResultHref(item: SearchResultItem): string {
  switch (item.type) {
    case 'project':
      return `/dashboard/projects/${item.id}`
    case 'decision':
      return item.project ? `/dashboard/projects/${item.project.id}/decisions/${item.id}` : '/dashboard/decisions'
    case 'template':
      return `/dashboard/templates`
    case 'file':
      return item.project ? `/dashboard/projects/${item.project.id}/library` : '/dashboard/projects'
    default:
      return '/dashboard'
  }
}

export interface SearchResultCardProps {
  item: SearchResultItem
  onAttach?: (item: SearchResultItem) => void
  className?: string
}

export function SearchResultCard({ item, onAttach, className }: SearchResultCardProps) {
  const Icon = TYPE_ICONS[item.type]
  const href = getResultHref(item)

  return (
    <Card
      className={cn(
        'card-hover group overflow-hidden transition-all duration-200 hover:shadow-card-hover',
        className
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-muted p-2">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <Link
                  to={href}
                  className="font-medium text-foreground hover:text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 [&_mark]:bg-primary/20 [&_mark]:rounded [&_mark]:px-0.5"
                >
                  {item.highlights?.title && item.highlights.title.includes('<mark>') ? (
                    <span dangerouslySetInnerHTML={{ __html: item.highlights.title }} />
                  ) : (
                    item.title
                  )}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted-foreground">{TYPE_LABELS[item.type]}</span>
                  {item.project && (
                    <span className="text-xs text-muted-foreground">· {item.project.name}</span>
                  )}
                  {item.status && (
                    <Badge variant={getStatusVariant(item.status)} className="text-xs">
                      {item.status.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            {item.snippet && item.snippet !== item.title && (
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.snippet}</p>
            )}
            {item.date && (
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(item.date)}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Link to={href} aria-label={`Open ${item.title}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>
            {onAttach && (item.type === 'file' || item.type === 'template') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onAttach(item)}
                aria-label={`Attach to decision`}
              >
                <Paperclip className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
