import { useQuery } from '@tanstack/react-query'
import { LayoutTemplate, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Template } from '@/types'

const mockTemplates: Template[] = [
  { id: '1', name: 'Material selection', description: 'Compare material options', optionCount: 3, usageCount: 24 },
  { id: '2', name: 'Layout options', description: 'Floor plan variations', optionCount: 2, usageCount: 18 },
  { id: '3', name: 'Color palette', description: 'Paint and finish colors', optionCount: 4, usageCount: 12 },
]

export function TemplatesPage() {
  const { data: templates = mockTemplates, isLoading } = useQuery({
    queryKey: ['templates'],
    queryFn: () => api.get<Template[]>('/templates').catch(() => mockTemplates),
  })

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="mt-1 text-muted-foreground">Opinionated decision templates for common approvals</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create template
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <LayoutTemplate className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No templates yet</p>
            <p className="mt-2 max-w-md text-center text-muted-foreground">
              Create templates to speed up decision creation. Use them for materials, layouts, and more.
            </p>
            <Button className="mt-6">Create your first template</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id} className="card-hover cursor-pointer">
              <CardHeader className="flex flex-row items-start justify-between">
                <LayoutTemplate className="h-10 w-10 text-primary" />
                <span className="text-sm text-muted-foreground">{t.usageCount} uses</span>
              </CardHeader>
              <CardContent>
                <h3 className="font-semibold">{t.name}</h3>
                {t.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{t.description}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">{t.optionCount} options</p>
                <Button variant="outline" size="sm" className="mt-4 w-full">
                  Use template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
