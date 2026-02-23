import { useQuery } from '@tanstack/react-query'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose, SheetBody } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { History, Pencil, Play } from 'lucide-react'
import { getTemplate, getTemplateVersions } from '@/api/templates'
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
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export interface TemplatePreviewDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: string | null
  onEdit?: (template: TemplateLibrary | TemplateLibraryItem) => void
  onApply?: (template: TemplateLibrary | TemplateLibraryItem) => void
  onVersionHistory?: (template: TemplateLibrary | TemplateLibraryItem) => void
  projectId?: string | null
}

export function TemplatePreviewDrawer({
  open,
  onOpenChange,
  templateId,
  onEdit,
  onApply,
  onVersionHistory,
  projectId: _projectId,
}: TemplatePreviewDrawerProps) {
  const { data: template, isLoading } = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => getTemplate(templateId!),
    enabled: open && !!templateId,
  })

  const { data: versionsData } = useQuery({
    queryKey: ['template-versions', templateId],
    queryFn: () => getTemplateVersions(templateId!),
    enabled: open && !!templateId,
  })
  const versions = template?.versions ?? versionsData?.versions ?? []

  const defaultOptions =
    (template?.content as { defaultOptions?: { title: string; description?: string }[] })
      ?.defaultOptions ?? []

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-lg flex-col sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{template?.name ?? 'Template'}</SheetTitle>
          <SheetDescription>
            {template && (
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">
                  {TYPE_LABELS[template.type] ?? template.type}
                </Badge>
                <Badge variant="outline">v{template.version}</Badge>
                {template.usageCount !== undefined && (
                  <span className="text-muted-foreground">
                    {template.usageCount} uses
                  </span>
                )}
              </div>
            )}
          </SheetDescription>
          <SheetClose />
        </SheetHeader>
        <SheetBody className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : template ? (
            <div className="space-y-6">
              {template.description && (
                <p className="text-muted-foreground">{template.description}</p>
              )}

              {template.tags && template.tags.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-medium">Default options</h4>
                {defaultOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No options defined</p>
                ) : (
                  <ul className="space-y-2">
                    {defaultOptions.map((opt, i) => (
                      <li
                        key={i}
                        className="rounded-lg border border-border bg-muted/30 p-3"
                      >
                        <p className="font-medium">{opt.title}</p>
                        {opt.description && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {opt.description}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {versions.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-medium">Recent versions</h4>
                  <ul className="space-y-2">
                    {versions.slice(0, 5).map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between rounded-lg border border-border p-2 text-sm"
                      >
                        <span>v{v.versionNumber}</span>
                        <span className="text-muted-foreground">
                          {formatDate(v.createdAt)}
                        </span>
                        {v.changesSummary && (
                          <span className="truncate text-muted-foreground">
                            {v.changesSummary}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-4">
                {onApply && (
                  <Button
                    onClick={() => {
                      onApply(template)
                      onOpenChange(false)
                    }}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Apply to project
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onEdit(template)
                      onOpenChange(false)
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                )}
                {onVersionHistory && template && (
                  <Button
                    variant="outline"
                    onClick={() => onVersionHistory(template)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    Version history
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}
