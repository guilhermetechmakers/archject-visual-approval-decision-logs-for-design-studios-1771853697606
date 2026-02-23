import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FileCheck } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Decision } from '@/types'

const mockDecisions: Decision[] = [
  { id: '1', projectId: '1', title: 'Kitchen counter material', status: 'pending', options: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', projectId: '1', title: 'Flooring option', status: 'approved', options: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

export function DecisionsListPage() {
  const { data: decisions = mockDecisions, isLoading } = useQuery({
    queryKey: ['decisions'],
    queryFn: () => api.get<Decision[]>('/decisions').catch(() => mockDecisions),
  })

  const statusVariant = (s: string) =>
    s === 'approved' ? 'success' : s === 'pending' ? 'warning' : 'secondary'

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Decisions</h1>
        <p className="mt-1 text-muted-foreground">All decisions across projects</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : decisions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileCheck className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No decisions yet</p>
            <p className="mt-2 max-w-md text-center text-muted-foreground">
              Create decisions from a project workspace.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {decisions.map((d) => (
                <Link
                  key={d.id}
                  to={`/dashboard/projects/${d.projectId}/decisions/${d.id}`}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
                >
                  <p className="font-medium">{d.title}</p>
                  <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
