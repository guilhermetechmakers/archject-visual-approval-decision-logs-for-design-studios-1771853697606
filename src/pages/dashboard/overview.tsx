import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FolderKanban,
  FileCheck,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Project, ActivityItem } from '@/types'

const mockProjects: Project[] = [
  { id: '1', name: 'Riverside Residence', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pendingApprovalsCount: 3 },
  { id: '2', name: 'Downtown Office', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pendingApprovalsCount: 1 },
]

const mockActivity: ActivityItem[] = [
  { id: '1', type: 'decision_approved', message: 'Material selection approved for Riverside Residence', timestamp: new Date().toISOString(), userName: 'Client' },
  { id: '2', type: 'decision_created', message: 'New layout options added', timestamp: new Date().toISOString(), userName: 'You' },
]

export function DashboardOverview() {
  const { data: projects = mockProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').catch(() => mockProjects),
  })

  const { data: activity = mockActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['activity'],
    queryFn: () => api.get<ActivityItem[]>('/activity').catch(() => mockActivity),
  })

  const pendingCount = projects.reduce((sum, p) => sum + (p.pendingApprovalsCount ?? 0), 0)

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Overview of your projects and approvals</p>
      </div>

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Active Projects', value: projects.length, icon: FolderKanban, trend: null },
          { label: 'Pending Approvals', value: pendingCount, icon: Clock, trend: pendingCount > 0 ? 'up' : null },
          { label: 'Decisions This Week', value: 12, icon: FileCheck, trend: 'up' as const },
          { label: 'Approval Rate', value: '94%', icon: TrendingUp, trend: 'up' as const },
        ].map((m) => (
          <Card key={m.label} className="card-hover overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {m.label}
              </CardTitle>
              <m.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{m.value}</div>
              {m.trend && (
                <p className="text-xs text-success">↑ vs last week</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Projects */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Projects</CardTitle>
              <CardDescription>Your active projects</CardDescription>
            </div>
            <Link to="/dashboard/projects/new">
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New project
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {projectsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FolderKanban className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-medium">No projects yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create your first project to get started
                </p>
                <Link to="/dashboard/projects/new" className="mt-4">
                  <Button>Create project</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    to={`/dashboard/projects/${p.id}`}
                    className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-sm text-muted-foreground">{p.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.pendingApprovalsCount ? (
                        <Badge variant="warning">{p.pendingApprovalsCount} pending</Badge>
                      ) : null}
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                ))}
                <Link to="/dashboard/projects" className="block pt-2 text-sm text-primary hover:underline">
                  View all projects →
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest updates across projects</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activity.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileCheck className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-medium">No activity yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Activity will appear here as you work
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activity.slice(0, 5).map((a) => (
                  <div key={a.id} className="flex gap-3 border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="text-sm">{a.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(a.timestamp).toLocaleDateString()} · {a.userName ?? 'System'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
