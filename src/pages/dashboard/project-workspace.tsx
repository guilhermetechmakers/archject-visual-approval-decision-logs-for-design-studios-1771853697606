import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Share2,
  Plus,
  FileCheck,
  FileStack,
  LayoutTemplate,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Project, Decision } from '@/types'

const mockProject: Project = {
  id: '1',
  name: 'Riverside Residence',
  description: 'Residential project with material and layout approvals',
  status: 'active',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pendingApprovalsCount: 3,
}

const mockDecisions: Decision[] = [
  { id: '1', projectId: '1', title: 'Kitchen counter material', status: 'pending', options: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: '2', projectId: '1', title: 'Flooring option', status: 'approved', approvedOptionId: 'opt1', options: [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

export function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project = mockProject, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get<Project>(`/projects/${projectId}`).catch(() => mockProject),
    enabled: !!projectId,
  })

  const { data: decisions = mockDecisions } = useQuery({
    queryKey: ['decisions', projectId],
    queryFn: () => api.get<Decision[]>(`/projects/${projectId}/decisions`).catch(() => mockDecisions),
    enabled: !!projectId,
  })

  const statusVariant = (s: string) =>
    s === 'approved' ? 'success' : s === 'pending' ? 'warning' : 'secondary'

  return (
    <div className="space-y-8 animate-in">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">{project.name}</span>
          </nav>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-64" />
          ) : (
            <h1 className="mt-2 text-2xl font-bold">{project.name}</h1>
          )}
          {project.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New decision
          </Button>
        </div>
      </div>

      {/* Tabs / Sections */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Decisions list */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Decisions
              </CardTitle>
              <Link to={`/dashboard/projects/${projectId}/decisions/new`}>
                <Button size="sm" variant="outline">Add</Button>
              </Link>
            </CardHeader>
            <CardContent>
              {decisions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 font-medium">No decisions yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Create a decision to get client approval
                  </p>
                  <Link to={`/dashboard/projects/${projectId}/decisions/new`} className="mt-4">
                    <Button>Create decision</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {decisions.map((d) => (
                    <Link
                      key={d.id}
                      to={`/dashboard/projects/${projectId}/decisions/${d.id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                    >
                      <p className="font-medium">{d.title}</p>
                      <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: Library, Templates, Activity */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileStack className="h-4 w-4" />
                Drawings & Specs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to={`/dashboard/projects/${projectId}/library`}>
                <Button variant="outline" size="sm" className="w-full">
                  View library
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <LayoutTemplate className="h-4 w-4" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/templates">
                <Button variant="outline" size="sm" className="w-full">
                  Browse templates
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
