import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Share2,
  Plus,
  FileCheck,
  FileStack,
  LayoutTemplate,
  BarChart3,
  FileText,
  Settings,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import { getLibraryFiles } from '@/api/library'
import { getDashboardProjects } from '@/api/dashboard'
import type { Decision } from '@/types'

export function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const res = await getDashboardProjects({ pageSize: 100 })
      const p = res.items.find((i) => i.id === projectId)
      return p
        ? { id: p.id, name: p.name, description: '', status: 'active' as const }
        : { id: projectId!, name: 'Project', description: '', status: 'active' as const }
    },
    enabled: !!projectId,
  })

  const { data: decisions = [] } = useQuery({
    queryKey: ['decisions', projectId],
    queryFn: () => api.get<Decision[]>(`/projects/${projectId}/decisions`),
    enabled: !!projectId,
  })

  const { data: libraryFiles = [] } = useQuery({
    queryKey: ['library-files', projectId, 'workspace'],
    queryFn: () => getLibraryFiles(projectId!, { includeArchived: false }),
    enabled: !!projectId,
  })

  const recentFiles = libraryFiles.slice(0, 4)

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
            <span className="text-foreground">{project?.name ?? 'Project'}</span>
          </nav>
          {isLoading ? (
            <Skeleton className="mt-2 h-8 w-64" />
          ) : (
            <h1 className="mt-2 text-2xl font-bold">{project?.name ?? 'Project'}</h1>
          )}
          {project?.description && (
            <p className="mt-1 text-muted-foreground">{project.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link to={`/dashboard/projects/${projectId}/analytics`}>
            <Button variant="outline" size="sm">
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </Button>
          <Link to={`/dashboard/projects/${projectId}/decisions/new`}>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              New decision
            </Button>
          </Link>
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
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileStack className="h-4 w-4" />
                Drawings & Specs
              </CardTitle>
              <Link to={`/dashboard/projects/${projectId}/library`}>
                <Button size="sm" variant="ghost" className="h-8 text-xs">
                  View all
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {recentFiles.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-muted-foreground">No files yet</p>
                  <Link to={`/dashboard/projects/${projectId}/library`} className="mt-2 inline-block">
                    <Button variant="outline" size="sm">
                      Upload files
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    {recentFiles.map((f) => (
                      <Link
                        key={f.id}
                        to={`/dashboard/projects/${projectId}/library`}
                        className="group flex flex-col overflow-hidden rounded-lg border border-border bg-muted/30 p-2 transition-all hover:border-primary/30 hover:shadow-sm"
                      >
                        <div className="aspect-square flex items-center justify-center rounded bg-muted">
                          {f.thumbnailUrl ? (
                            <img
                              src={f.thumbnailUrl}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs font-medium" title={f.filename}>
                          {f.filename}
                        </p>
                      </Link>
                    ))}
                  </div>
                  <Link to={`/dashboard/projects/${projectId}/library`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View library
                    </Button>
                  </Link>
                </div>
              )}
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
              <Link to={`/dashboard/projects/${projectId}/templates`}>
                <Button variant="outline" size="sm" className="w-full">
                  Browse templates
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to={`/dashboard/projects/${projectId}/analytics`}>
                <Button variant="outline" size="sm" className="w-full">
                  View analytics
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Client sharing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 text-sm text-muted-foreground">
                Share decision links with clients for approval. Each decision has its own secure link.
              </p>
              <Link to={`/dashboard/projects/${projectId}/decisions/new`}>
                <Button variant="outline" size="sm" className="w-full">
                  <Share2 className="mr-2 h-4 w-4" />
                  Create & share decision
                </Button>
              </Link>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                Project settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Link to="/dashboard/settings">
                <Button variant="outline" size="sm" className="w-full">
                  Open settings
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
