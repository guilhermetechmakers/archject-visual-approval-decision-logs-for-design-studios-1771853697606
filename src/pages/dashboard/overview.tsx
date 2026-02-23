import { useState, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  FolderKanban,
  Clock,
  TrendingUp,
  Zap,
  Plus,
  ArrowRight,
  RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { getLastProject } from '@/components/layout/sidebar'
import {
  getDashboardMetrics,
  getDashboardProjects,
  getDashboardActivities,
  getDashboardSummary,
} from '@/api/dashboard'
import {
  MetricsSnapshotCard,
  ProjectCard,
  RecentActivityFeed,
  QuickActionsPanel,
  SearchBarWithFilters,
  NotificationsInlineCard,
  EmptyProjectsState,
} from '@/components/dashboard'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { CreateProjectModal } from '@/components/dashboard/create-project-modal'

export function DashboardOverview() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [createProjectOpen, setCreateProjectOpen] = useState(false)

  const refreshDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-activities'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard-notifications-summary'] })
  }, [queryClient])

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: getDashboardMetrics,
    retry: 1,
  })

  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['dashboard-projects', search],
    queryFn: () =>
      getDashboardProjects({ page: 1, pageSize: 12, search: search || undefined }),
    retry: 1,
  })

  const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
    queryKey: ['dashboard-activities'],
    queryFn: getDashboardActivities,
    retry: 1,
  })

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
    retry: 1,
  })

  const projects = projectsData?.items ?? []
  const activities = activitiesData?.items ?? []
  const lastProjectId = getLastProject()
  const lastProject = lastProjectId
    ? projects.find((p) => p.id === lastProjectId)
    : null
  const hasLastProject = !!lastProjectId
  const pendingApprovals = metrics?.pendingApprovals ?? summary?.pendingApprovalsCount ?? 0
  const pendingItems = summary?.pendingApprovals?.slice(0, 3).map((a) => ({
    id: a.id,
    title: a.title,
    message: `${a.project} · ${a.client}`,
    link: a.projectId
      ? `/dashboard/projects/${a.projectId}/decisions/${a.id}`
      : '/dashboard/projects',
  })) ?? []

  const formatAvgResponse = (ms: number) => {
    if (ms < 60000) return `${Math.round(ms / 1000)}s`
    if (ms < 3600000) return `${Math.round(ms / 60000)}m`
    return `${(ms / 3600000).toFixed(1)}h`
  }

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">
            Overview of your projects and approvals
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchBarWithFilters
          value={search}
          onSearch={setSearch}
          placeholder="Search projects, decisions, templates..."
          className="max-w-md"
        />
        {hasLastProject && (
          <Link
            to={`/dashboard/projects/${lastProjectId}`}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <RotateCcw className="h-4 w-4 text-muted-foreground" aria-hidden />
            {lastProject ? `Resume: ${lastProject.name}` : 'Resume last project'}
          </Link>
        )}
      </div>

      <QuickActionsPanel onActionComplete={refreshDashboard} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <MetricsSnapshotCard
              metricLabel="Pending Approvals"
              value={metrics?.pendingApprovals ?? 0}
              delta={pendingApprovals > 0 ? 'Needs attention' : null}
              deltaDirection={pendingApprovals > 0 ? 'up' : 'neutral'}
              statusColor={pendingApprovals > 0 ? 'warning' : 'neutral'}
              icon={Clock}
            />
            <MetricsSnapshotCard
              metricLabel="Active Projects"
              value={metrics?.activeProjects ?? 0}
              icon={FolderKanban}
            />
            <MetricsSnapshotCard
              metricLabel="Avg Response Time"
              value={formatAvgResponse(metrics?.avgResponseTimeMs ?? 0)}
              delta="vs last week"
              deltaDirection="up"
              icon={TrendingUp}
            />
            <MetricsSnapshotCard
              metricLabel="Export Credits"
              value={metrics?.exportCredits ?? 100}
              icon={Zap}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Button size="sm" onClick={() => setCreateProjectOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New project
            </Button>
          </div>
          {projectsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : projects.length === 0 ? (
            <EmptyProjectsState onCreateClick={() => setCreateProjectOpen(true)} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
          {projects.length > 0 && (
            <Link
              to="/dashboard/projects"
              className="inline-flex items-center text-sm text-primary hover:underline"
            >
              View all projects
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="space-y-6">
          <RecentActivityFeed
            items={activities}
            isLoading={activitiesLoading}
          />
          <NotificationsInlineCard
            items={pendingItems}
            unreadCount={pendingApprovals}
          />
        </div>
      </div>

      <CreateProjectModal
        open={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onSuccess={() => {
          setCreateProjectOpen(false)
          refreshDashboard()
        }}
      />
    </div>
  )
}
