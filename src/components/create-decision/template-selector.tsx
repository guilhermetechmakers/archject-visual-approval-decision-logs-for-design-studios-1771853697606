import { LayoutTemplate, Plus } from 'lucide-react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { DecisionTemplate } from '@/api/decisions-create'

export interface TemplateSelectorProps {
  templates: DecisionTemplate[]
  isLoading: boolean
  selectedId: string | null
  onSelect: (templateId: string | null) => void
  onContinue: () => void
}

export function TemplateSelector({
  templates,
  isLoading,
  selectedId,
  onSelect,
  onContinue,
}: TemplateSelectorProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold">Choose a template</h2>
        <p className="mt-1 text-muted-foreground">
          Start from a pre-built template or create from scratch
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card
            className={cn(
              'cursor-pointer transition-all duration-200 card-hover',
              selectedId === '__scratch__'
                ? 'border-primary ring-2 ring-primary/20 shadow-card-hover'
                : 'border-border hover:border-primary/50'
            )}
            onClick={() => onSelect('__scratch__')}
          >
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-muted">
                <Plus className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <CardTitle className="text-base">Start from scratch</CardTitle>
                <CardDescription>Create a custom decision with your own options</CardDescription>
              </div>
            </CardHeader>
          </Card>

          {templates.map((t) => (
            <Card
              key={t.id}
              className={cn(
                'cursor-pointer transition-all duration-200 card-hover',
                selectedId === t.id
                  ? 'border-primary ring-2 ring-primary/20 shadow-card-hover'
                  : 'border-border hover:border-primary/50'
              )}
              onClick={() => onSelect(t.id)}
            >
              <CardHeader className="flex flex-row items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <LayoutTemplate className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base">{t.name}</CardTitle>
                  <CardDescription>{t.description}</CardDescription>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t.defaultOptions.length} options included
                  </p>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={onContinue} disabled={!selectedId}>
          Continue to options
        </Button>
      </div>
    </div>
  )
}
