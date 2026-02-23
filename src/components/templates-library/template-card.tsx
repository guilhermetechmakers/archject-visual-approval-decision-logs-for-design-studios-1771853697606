import {
  LayoutTemplate,
  MoreVertical,
  Play,
  Pencil,
  Copy,
  Download,
  Archive,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { TemplateLibrary, TemplateLibraryItem } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  FINISHES: 'Finishes',
  LAYOUTS: 'Layouts',
  CHANGE_REQUESTS: 'Change Requests',
  VARIATIONS: 'Variations',
  PERMITS: 'Permits',
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

export interface TemplateCardProps {
  template: TemplateLibrary | TemplateLibraryItem
  onOpen?: (template: TemplateLibrary | TemplateLibraryItem) => void
  onPreview?: (template: TemplateLibrary | TemplateLibraryItem) => void
  onApply: (template: TemplateLibrary | TemplateLibraryItem) => void
  onEdit: (template: TemplateLibrary | TemplateLibraryItem) => void
  onDuplicate: (template: TemplateLibrary | TemplateLibraryItem) => void
  onExport: (template: TemplateLibrary | TemplateLibraryItem) => void
  onArchive?: (template: TemplateLibrary | TemplateLibraryItem) => void
  onDelete?: (template: TemplateLibrary | TemplateLibraryItem) => void
  projectId?: string | null
  className?: string
}

export function TemplateCard({
  template,
  onOpen,
  onPreview,
  onApply,
  onEdit,
  onDuplicate,
  onExport,
  onArchive,
  onDelete,
  className,
}: TemplateCardProps) {
  const handleOpen = onPreview ?? onOpen
  const optionCount =
    template.optionCount ??
    (template.content as { defaultOptions?: unknown[] })?.defaultOptions?.length ??
    0
  const usageCount = template.usageCount ?? 0
  const typeLabel = TYPE_LABELS[template.type] ?? template.type

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => handleOpen?.(template)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleOpen?.(template)
        }
      }}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        template.isArchived && 'opacity-60',
        className
      )}
    >
      {/* Preview area */}
      <div className="relative flex aspect-[4/3] items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <LayoutTemplate className="h-16 w-16 text-primary/60" />
        {template.isArchived && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Badge variant="secondary">Archived</Badge>
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <Badge variant="secondary" className="text-xs">
            {typeLabel}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="truncate font-semibold text-foreground" title={template.name}>
          {template.name}
        </h3>
        {template.description && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {template.description}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{optionCount} options</span>
          <span>{usageCount} uses</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Updated {formatDate(template.updatedAt)}
        </p>

        <div className="mt-auto flex items-center justify-between pt-3">
          <Button
            size="sm"
            className="btn-hover"
            onClick={(e) => {
              e.stopPropagation()
              onApply(template)
            }}
          >
            <Play className="mr-2 h-4 w-4" />
            Apply
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
                aria-label="More actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {handleOpen && (
                <DropdownMenuItem onClick={() => handleOpen(template)}>
                  Open preview
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onApply(template)}>
                <Play className="mr-2 h-4 w-4" />
                Apply to project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(template)}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport(template)}>
                <Download className="mr-2 h-4 w-4" />
                Export
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onArchive && !template.isArchived && (
                <DropdownMenuItem onClick={() => onArchive(template)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(template)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
