import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { adminApi } from '@/api/admin'
import { Download, Building2, FileCheck, Clock, AlertTriangle } from 'lucide-react'

function formatTurnaround(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return secs ? `${mins}m ${secs}s` : `${mins}m`
}

export function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState(30)
  const [auditPage, setAuditPage] = useState(1)

  const from = new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  const to = new Date().toISOString().slice(0, 10)

  const { data: metrics } = useQuery({
    queryKey: ['admin', 'metrics-summary'],
    queryFn: () => adminApi.getMetricsSummary(),
  })

  const { data: approvalsData, isLoading } = useQuery({
    queryKey: ['admin', 'analytics', 'approvals', from, to],
    queryFn: () => adminApi.getAnalyticsApprovals({ from, to, groupBy: 'studio' }),
  })

  const { data: auditData } = useQuery({
    queryKey: ['admin', 'audit-logs', auditPage],
    queryFn: () => adminApi.getAuditLogs({ page: auditPage, perPage: 20 }),
  })

  const chartData = approvalsData?.data ?? []
  const auditLogs = auditData?.logs ?? []
  const auditTotal = auditData?.total ?? 0
  const m = metrics ?? {
    activeStudios: 0,
    dailyApprovals: 0,
    avgTurnaroundSeconds: 0,
    platformErrorRate: 0,
  }

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Analytics & Reports</h1>
        <p className="mt-1 text-muted-foreground">
          Cross-account approval metrics, bottlenecks, and exportable reports
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-xl border border-border shadow-card transition-all duration-200 hover:shadow-card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-muted-foreground">Active Studios</span>
            <Building2 className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-primary">{m.activeStudios}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border shadow-card transition-all duration-200 hover:shadow-card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-muted-foreground">Daily Approvals</span>
            <FileCheck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{m.dailyApprovals}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border shadow-card transition-all duration-200 hover:shadow-card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-muted-foreground">Avg Turnaround</span>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatTurnaround(m.avgTurnaroundSeconds)}</p>
          </CardContent>
        </Card>
        <Card className="rounded-xl border border-border shadow-card transition-all duration-200 hover:shadow-card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <span className="text-sm font-medium text-muted-foreground">Error Rate</span>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{(m.platformErrorRate * 100).toFixed(2)}%</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Approvals by Studio</CardTitle>
            <div className="flex gap-2">
              {[7, 30, 90].map((d) => (
                <Button
                  key={d}
                  variant={dateRange === d ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDateRange(d)}
                >
                  {d}d
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : chartData.length === 0 ? (
              <div className="flex h-[280px] items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground">
                No data
              </div>
            ) : (
              <div className="h-[280px]" role="img" aria-label="Approvals by studio bar chart">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
                    <XAxis dataKey="group" tick={{ fontSize: 12 }} stroke="rgb(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="rgb(var(--muted-foreground))" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgb(var(--card))',
                        border: '1px solid rgb(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Bar dataKey="approvals" fill="rgb(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-xl lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Export Reports</CardTitle>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Configure filters and schedule recurring exports. Exports are generated asynchronously and delivered via email.
            </p>
            <div className="mt-4 flex gap-2">
              <Button size="sm">Schedule daily export</Button>
              <Button variant="outline" size="sm">Schedule weekly export</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
          <p className="text-sm text-muted-foreground">Recent admin actions</p>
        </CardHeader>
        <CardContent>
          {auditLogs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No audit entries
            </div>
          ) : (
            <div className="space-y-2">
              {auditLogs.map((log: { id: string; action_type: string; target_type: string; target_id: string; created_at: string }) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm transition-colors hover:bg-muted/50"
                >
                  <span>
                    <strong>{log.action_type}</strong> on {log.target_type}
                    {log.target_id && ` (${log.target_id.slice(0, 8)})`}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
              {auditTotal > 20 && (
                <div className="mt-4 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAuditPage((p) => Math.max(1, p - 1))}
                    disabled={auditPage <= 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAuditPage((p) => p + 1)}
                    disabled={auditPage * 20 >= auditTotal}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
