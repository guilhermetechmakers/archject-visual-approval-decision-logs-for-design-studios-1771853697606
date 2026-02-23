import { useQuery } from '@tanstack/react-query'
import {
  Building2,
  FileCheck,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { MetricCard } from '@/components/admin/metric-card'
import { SystemHealthCard } from '@/components/admin/system-health-card'
import { UsageCharts } from '@/components/admin/usage-charts'
import { UserManagementQuickView } from '@/components/admin/user-management-quick-view'
import { SessionsPanel } from '@/components/admin/sessions-panel'
import { SupportTicketsTable } from '@/components/admin/support-tickets-table'
import { AdminToolsPanel } from '@/components/admin/admin-tools-panel'
import { adminApi } from '@/api/admin'
import { Skeleton } from '@/components/ui/skeleton'

function formatTurnaround(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs ? `${mins}m ${secs}s` : `${mins}m`
}

export function AdminDashboardPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin', 'metrics-summary'],
    queryFn: () => adminApi.getMetricsSummary(),
  })

  const { data: seriesData } = useQuery({
    queryKey: ['admin', 'metrics-series', 7],
    queryFn: () => adminApi.getMetricsSeries('approvals', 7),
  })

  const m = metrics ?? {
    activeStudios: 0,
    dailyApprovals: 0,
    avgTurnaroundSeconds: 0,
    platformErrorRate: 0,
  }

  const sparklineData = seriesData?.series?.map((s) => ({ value: s.value })) ?? []

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Platform health, metrics, and operations overview
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <MetricCard
              title="Active Studios"
              value={m.activeStudios}
              icon={Building2}
              linkTo="/admin/analytics"
              sparklineData={sparklineData}
            />
            <MetricCard
              title="Daily Approvals"
              value={m.dailyApprovals}
              trend="up"
              icon={FileCheck}
              linkTo="/admin/analytics"
              sparklineData={sparklineData}
            />
            <MetricCard
              title="Avg. Approval Turnaround"
              value={formatTurnaround(m.avgTurnaroundSeconds)}
              icon={Clock}
              linkTo="/admin/analytics"
              sparklineData={sparklineData}
            />
            <MetricCard
              title="Platform Error Rate"
              value={`${(m.platformErrorRate * 100).toFixed(2)}%`}
              trend={m.platformErrorRate > 0.05 ? 'up' : undefined}
              icon={AlertTriangle}
              sparklineData={sparklineData}
            />
          </>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <SystemHealthCard />
        <UsageCharts />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <UserManagementQuickView />
        <SessionsPanel />
      </div>

      <SupportTicketsTable />

      <AdminToolsPanel />
    </div>
  )
}
