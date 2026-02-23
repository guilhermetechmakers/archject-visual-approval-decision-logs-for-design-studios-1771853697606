import { useEffect, useState } from 'react'
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
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { api } from '@/lib/api'
import { getLibraryFiles } from '@/api/library'
import { getDashboardProjects } from '@/api/dashboard'
import { DecisionCard } from '@/components/decisions'
import { setLastProject } from '@/components/layout/sidebar'
import type { Decision } from '@/types'

export function ProjectWorkspace() {
  const { projectId } = useParams<{ projectId: string }>()

  useEffect(() => {
    if (projectId) {
      setLastProject(projectId)
    }
  }, [projectId])
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

  const { data: decisions = [], isLoading: decisionsLoading } = useQuery({
    queryKey: ['decisions', projectId],
    queryFn: () => api.get<Decision[]>(`/projects/${projectId}/decisions`),
    enabled: !!projectId,
  })

  const [decisionFilter, setDecisionFilter] = useState('')
  const filteredDecisions = decisionFilter
    ? decisions.filter(
        (d) =>
          d.title.toLowerCase().includes(decisionFilter.toLowerCase()) ||
          d.status.toLowerCase().includes(decisionFilter.toLowerCase())
      )
    : decisions

  const { data: libraryFiles = [] } = useQuery({
    queryKey: ['library-files', projectId, 'workspace'],
    queryFn: () => getLibraryFiles(projectId!, { includeArchived: false }),
    enabled: !!projectId,
  })

  const recentFiles = libraryFiles.slice(0, 4)

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

      {/* Two-column layout: Decision Cards (left) | Drawings, Templates, Settings (right) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Decision Cards - left pane with visual previews */}
        <div className="lg:col-span-8">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Decisions
              </CardTitle>
              <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                <div className="relative flex-1 max-w-xs">
                  <Search
                    className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    placeholder="Filter decisions..."
                    value={decisionFilter}
                    onChange={(e) => setDecisionFilter(e.target.value)}
                    className="pl-9"
                    aria-label="Filter decisions by title or status"
                  />
                </div>
                <Link to={`/dashboard/projects/${projectId}/decisions/new`}>
                  <Button size="sm" variant="outline">Add</Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {decisionsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-48 rounded-xl" />
                  ))}
                </div>
              ) : filteredDecisions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck className="h-12 w-12 text-muted-foreground" />
                  <p className="mt-4 font-medium">
                    {decisionFilter ? 'No matching decisions' : 'No decisions yet'}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {decisionFilter
                      ? 'Try adjusting your filter'
                      : 'Create a decision to get client approval'}
                  </p>
                  {decisionFilter ? (
                    <Button className="mt-4" onClick={() => setDecisionFilter('')}>
                      Clear filter
                    </Button>
                  ) : (
                    <Link
                      to={`/dashboard/projects/${projectId}/decisions/new`}
                      className="mt-4"
                    >
                      <Button>Create decision</Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {filteredDecisions.map((d) => (
                    <DecisionCard
                      key={d.id}
                      decision={d}
                      projectId={projectId!}
                      showActions
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right pane: Drawings/Specs, Templates, Project Settings */}
        <div className="lg:col-span-4 space-y-4">
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
