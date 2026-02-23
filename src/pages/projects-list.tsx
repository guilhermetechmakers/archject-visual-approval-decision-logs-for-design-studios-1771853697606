import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { FolderKanban, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Project } from '@/types'

const mockProjects: Project[] = [
  { id: '1', name: 'Riverside Residence', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pendingApprovalsCount: 3 },
  { id: '2', name: 'Downtown Office', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pendingApprovalsCount: 1 },
]

export function ProjectsListPage() {
  const { data: projects = mockProjects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').catch(() => mockProjects),
  })

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="mt-1 text-muted-foreground">Manage your design projects</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New project
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderKanban className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No projects yet</p>
            <p className="mt-2 max-w-md text-center text-muted-foreground">
              Create your first project to start managing decisions and approvals.
            </p>
            <Button className="mt-6">Create project</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link key={p.id} to={`/dashboard/projects/${p.id}`}>
              <Card className="card-hover h-full">
                <CardContent className="p-6">
                  <FolderKanban className="h-10 w-10 text-primary" />
                  <h3 className="mt-4 font-semibold">{p.name}</h3>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="secondary">{p.status}</Badge>
                    {p.pendingApprovalsCount ? (
                      <Badge variant="warning">{p.pendingApprovalsCount} pending</Badge>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
