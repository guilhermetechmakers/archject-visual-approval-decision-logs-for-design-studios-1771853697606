import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BarChart3, Download } from 'lucide-react'
import {
  AnalyticsFiltersBar,
  KPICardsRow,
  BottleneckHeatmap,
  DistributionHistogram,
  SlowDecisionsTable,
  ReportBuilderModal,
  AlertsManager,
  ExportHistoryList,
} from '@/components/analytics'
import type { AnalyticsFilters } from '@/components/analytics'
import { analyticsApi } from '@/api/analytics'
import { Skeleton } from '@/components/ui/skeleton'

const getDefaultFilters = (projectId?: string): AnalyticsFilters => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  return {
    datePreset: '30',
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    projectId: projectId || '',
    decisionType: '',
    status: '',
    search: '',
    slaOverlay: false,
  }
}

export function ProjectAnalyticsPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const [filters, setFilters] = useState<AnalyticsFilters>(() => getDefaultFilters(projectId))
  const [selectedBucket, setSelectedBucket] = useState<string | undefined>()
  const [, setHeatmapFilter] = useState<{ status?: string; bucket?: string } | null>(null)
  const [decisionsPage, setDecisionsPage] = useState(1)
  const [decisionsSort, setDecisionsSort] = useState('timeToDecision')
  const [decisionsSortDir, setDecisionsSortDir] = useState('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showReportBuilder, setShowReportBuilder] = useState(false)

  const effectiveProjectId = filters.projectId || projectId || ''

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['analytics', 'project', effectiveProjectId, filters.start, filters.end],
    queryFn: () =>
      analyticsApi.getProjectAnalytics(effectiveProjectId, {
        start: filters.start,
        end: filters.end,
        groupBy: 'day',
      }),
    enabled: !!effectiveProjectId,
  })

  const { data: decisionsData, isLoading: decisionsLoading } = useQuery({
    queryKey: [
      'analytics',
      'decisions',
      effectiveProjectId,
      filters.start,
      filters.end,
      filters.status,
      filters.decisionType,
      decisionsPage,
      decisionsSort,
      decisionsSortDir,
    ],
    queryFn: () =>
      analyticsApi.getDecisions({
        projectId: effectiveProjectId || undefined,
        start: filters.start,
        end: filters.end,
        status: filters.status || undefined,
        type: filters.decisionType || undefined,
        page: decisionsPage,
        limit: 20,
        sort: decisionsSort,
        sortDir: decisionsSortDir,
      }),
    enabled: !!effectiveProjectId,
  })

  const { data: projectsData } = useQuery({
    queryKey: ['analytics', 'projects'],
    queryFn: () => analyticsApi.getProjects(),
  })

  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['analytics', 'alerts', effectiveProjectId],
    queryFn: () => analyticsApi.getAlerts({ scope: 'project', scopeId: effectiveProjectId || undefined }),
  })

  const { data: exportsData, refetch: refetchExports } = useQuery({
    queryKey: ['analytics', 'exports'],
    queryFn: () => analyticsApi.getExports(10),
  })

  const projects = projectsData?.projects ?? []
  const alerts = alertsData?.alerts ?? []
  const exportsList = exportsData?.exports ?? []

  const kpis = analyticsData?.kpis ?? {
    medianApprovalSeconds: 0,
    pctWithinSla: 0,
    totalDecisions: 0,
    avgResponseSeconds: 0,
    pendingCount: 0,
  }

  const heatmap = analyticsData?.heatmap ?? {}
  const distribution = analyticsData?.distribution ?? []
  const decisions = decisionsData?.decisions ?? []
  const decisionsTotal = decisionsData?.total ?? 0
  const decisionsLimit = decisionsData?.limit ?? 20

  return (
    <div className="space-y-8 animate-in">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <nav className="text-sm text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground">Dashboard</Link>
            <span className="mx-2">/</span>
            {projectId && (
              <>
                <Link to={`/dashboard/projects/${projectId}`} className="hover:text-foreground">
                  Project
                </Link>
                <span className="mx-2">/</span>
              </>
            )}
            <span className="text-foreground">Analytics & Reports</span>
          </nav>
          <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold">
            <BarChart3 className="h-7 w-7 text-primary" />
            Analytics & Reports
          </h1>
          <p className="mt-1 text-muted-foreground">
            Approval turnaround, bottlenecks, and exportable reports
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowReportBuilder(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Download className="h-4 w-4" />
          Build Report
        </button>
      </div>

      <AnalyticsFiltersBar
        filters={filters}
        onFiltersChange={setFilters}
        projects={projects}
      />

      {analyticsLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <KPICardsRow
          kpis={kpis}
          trend={analyticsData?.trend}
          slaOverlay={filters.slaOverlay}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <BottleneckHeatmap
          heatmap={heatmap}
          onCellClick={(status, bucket) => setHeatmapFilter({ status, bucket })}
        />
        <DistributionHistogram
          data={distribution}
          selectedBucket={selectedBucket}
          onBucketSelect={setSelectedBucket}
        />
      </div>

      <SlowDecisionsTable
        decisions={decisions}
        total={decisionsTotal}
        page={decisionsPage}
        limit={decisionsLimit}
        isLoading={decisionsLoading}
        projectId={effectiveProjectId || undefined}
        onPageChange={setDecisionsPage}
        onSort={(sort, sortDir) => {
          setDecisionsSort(sort)
          setDecisionsSortDir(sortDir)
        }}
        sort={decisionsSort}
        sortDir={decisionsSortDir}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onExportSelected={(ids) => {
          setSelectedIds(new Set(ids))
          setShowReportBuilder(true)
        }}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AlertsManager
          alerts={alerts}
          projectId={effectiveProjectId || undefined}
          projects={projects}
          onRefresh={() => refetchAlerts()}
        />
        <ExportHistoryList
          exports={exportsList}
          onRefresh={() => refetchExports()}
          onDownload={(id) => {
            analyticsApi.downloadExport(id).catch(() => {
              // Toast will be shown by caller if needed
            })
          }}
        />
      </div>

      <ReportBuilderModal
        open={showReportBuilder}
        onClose={() => setShowReportBuilder(false)}
        projectId={effectiveProjectId || undefined}
        projects={projects}
        preselectedDecisionIds={selectedIds.size > 0 ? Array.from(selectedIds) : undefined}
        onExportComplete={() => refetchExports()}
      />
    </div>
  )
}
