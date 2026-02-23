import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  FolderKanban,
  FileCheck,
  Clock,
  TrendingUp,
  Plus,
  ArrowRight,
  UserPlus,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getDashboardSummary } from '@/api/dashboard'
import type { Project } from '@/types'

const mockProjects: Project[] = [
  { id: '1', name: 'Riverside Residence', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pendingApprovalsCount: 3 },
  { id: '2', name: 'Downtown Office', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), pendingApprovalsCount: 1 },
]

const mockDecisions = [
  { id: '1', title: 'Material selection', project: 'Riverside Residence', status: 'approved', date: new Date().toISOString() },
  { id: '2', title: 'Layout options', project: 'Downtown Office', status: 'pending', date: new Date().toISOString() },
  { id: '3', title: 'Finishes', project: 'Riverside Residence', status: 'in_review', date: new Date().toISOString() },
]

const mockPendingApprovals = [
  { id: '1', title: 'Layout options', client: 'Client A', project: 'Downtown Office' },
  { id: '2', title: 'Finishes', client: 'Client B', project: 'Riverside Residence' },
]

export function DashboardOverview() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    retry: 1,
  })

  const projects: Project[] = summary?.projects ?? mockProjects
  const projectsLoading = summaryLoading
  const recentDecisions = summary?.recentDecisions ?? mockDecisions
  const pendingApprovals = summary?.pendingApprovals ?? mockPendingApprovals


  const pendingCount = projects.reduce((sum, p) => sum + (p.pendingApprovalsCount ?? 0), 0)

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Overview of your projects and approvals</p>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link to="/dashboard/projects">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Decision
          </Button>
        </Link>
        <Link to="/dashboard/settings/team">
          <Button variant="outline" className="gap-2">
            <UserPlus className="h-4 w-4" />
            Invite Client
          </Button>
        </Link>
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
        {/* Projects Summary */}
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

        {/* Pending Approvals */}
        <Card>
          <CardHeader>
            <CardTitle>Pending Approvals</CardTitle>
            <CardDescription>Awaiting client sign-off</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle2 className="h-12 w-12 text-success/50" />
                <p className="mt-4 font-medium">All caught up</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No pending approvals
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingApprovals.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-lg border border-border p-4"
                  >
                    <div>
                      <p className="font-medium">{a.title}</p>
                      <p className="text-sm text-muted-foreground">{a.project} · {a.client}</p>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Decisions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Decisions</CardTitle>
          <CardDescription>Latest updates across projects</CardDescription>
        </CardHeader>
        <CardContent>
          {recentDecisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No decisions yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create decisions and they will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentDecisions.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between rounded-lg border border-border p-4"
                >
                  <div>
                    <p className="font-medium">{d.title}</p>
                    <p className="text-sm text-muted-foreground">{d.project} · {new Date(d.date).toLocaleDateString()}</p>
                  </div>
                  <Badge variant={d.status === 'approved' ? 'default' : d.status === 'pending' ? 'warning' : 'secondary'}>
                    {d.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
