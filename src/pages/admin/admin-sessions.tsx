import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { adminApi } from '@/api/admin'
import {
  Trash2,
  RefreshCw,
  Download,
  Search,
  ChevronRight,
  Monitor,
  Smartphone,
  Globe,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts'

interface UserSessionRow {
  id: string
  sessionId: string
  userId: string
  userName?: string
  userEmail?: string
  device: string
  ip: string
  platform?: string
  geoCity?: string
  geoCountry?: string
  lastActiveAt: string
  createdAt: string
  revoked?: boolean
}

function getPlatformIcon(platform?: string) {
  switch (platform) {
    case 'ios':
    case 'android':
      return <Smartphone className="h-4 w-4 text-muted-foreground" />
    default:
      return <Monitor className="h-4 w-4 text-muted-foreground" />
  }
}

export function AdminSessionsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [email, setEmail] = useState('')
  const [ip, setIp] = useState('')
  const [platform, setPlatform] = useState<string>('all')
  const [status, setStatus] = useState<string>('active')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [revokeSession, setRevokeSession] = useState<UserSessionRow | null>(null)
  const [detailSession, setDetailSession] = useState<UserSessionRow | null>(null)

  const filters = { page, email: email || undefined, ip: ip || undefined, platform: platform === 'all' ? undefined : platform, status: status === 'all' ? undefined : (status as 'active' | 'revoked') }
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user-sessions', filters],
    queryFn: () => adminApi.getUserSessions(filters),
  })

  const { data: metrics } = useQuery({
    queryKey: ['admin', 'user-sessions-metrics'],
    queryFn: () => adminApi.getUserSessionsMetrics(),
  })

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => adminApi.revokeUserSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-sessions'] })
      setRevokeSession(null)
      setDetailSession(null)
      toast.success('Session revoked')
    },
    onError: () => toast.error('Failed to revoke session'),
  })

  const bulkRevokeMutation = useMutation({
    mutationFn: (sessionIds: string[]) => adminApi.bulkRevokeUserSessions(sessionIds),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user-sessions'] })
      setSelectedIds(new Set())
      toast.success(`${ids.length} session(s) revoked`)
    },
    onError: () => toast.error('Failed to revoke sessions'),
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      const blob = await adminApi.exportUserSessions({ format: 'csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `user-sessions-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
    onSuccess: () => {
      toast.success('Export downloaded')
    },
    onError: () => toast.error('Export failed'),
  })

  const sessions = (data?.sessions ?? []) as UserSessionRow[]
  const total = data?.total ?? 0
  const perPage = data?.perPage ?? 20
  const totalPages = Math.ceil(total / perPage) || 1

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === sessions.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(sessions.map((s) => s.id || s.sessionId)))
  }

  const handleBulkRevoke = () => {
    const ids = Array.from(selectedIds)
    if (ids.length > 0) bulkRevokeMutation.mutate(ids)
  }

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">User Sessions</h1>
        <p className="mt-1 text-muted-foreground">
          Monitor and manage platform user sessions. Filter, revoke, and export session data.
        </p>
      </div>

      {/* Metrics cards */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold" style={{ color: 'rgb(0,82,204)' }}>
                {metrics.activeSessions}
              </p>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">By platform</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.byPlatform} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="platform" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="count" fill="rgb(0,82,204)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          <Card className="card-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Top countries</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics.byCountry.slice(0, 5)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="country" tick={{ fontSize: 10 }} />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="count" fill="rgb(0,82,204)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Session list</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Search, filter, and revoke user sessions. Select multiple for bulk revoke.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                <Download className="mr-1 h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[140px]">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="User email..."
                className="pl-8"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <Input
              placeholder="IP address..."
              className="w-32"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
            />
            <Select
              value={platform}
              onValueChange={setPlatform}
              options={[
                { value: 'all', label: 'All' },
                { value: 'web', label: 'Web' },
                { value: 'ios', label: 'iOS' },
                { value: 'android', label: 'Android' },
                { value: 'api', label: 'API' },
              ]}
              placeholder="Platform"
              className="w-32"
            />
            <Select
              value={status}
              onValueChange={setStatus}
              options={[
                { value: 'all', label: 'All' },
                { value: 'active', label: 'Active' },
                { value: 'revoked', label: 'Revoked' },
              ]}
              placeholder="Status"
              className="w-28"
            />
          </div>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-2">
              <span className="text-sm font-medium">{selectedIds.size} selected</span>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkRevoke}
                disabled={bulkRevokeMutation.isPending}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Revoke selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </div>
          )}

          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
              <RefreshCw className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No sessions found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                User sessions will appear here. Try adjusting filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedIds.size === sessions.length}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP · Location</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Last active</TableHead>
                      <TableHead className="w-24">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => {
                      const sid = s.id || s.sessionId
                      return (
                        <TableRow key={sid} className="hover:bg-muted/20">
                          <TableCell>
                            {!s.revoked && (
                              <Checkbox
                                checked={selectedIds.has(sid)}
                                onCheckedChange={() => toggleSelect(sid)}
                                aria-label={`Select ${s.userName}`}
                              />
                            )}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{s.userName ?? s.userEmail ?? s.userId}</p>
                              {s.userEmail && (
                                <p className="text-xs text-muted-foreground">{s.userEmail}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getPlatformIcon(s.platform)}
                              <span className="max-w-[120px] truncate">{s.device}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span>{s.ip || '—'}</span>
                            {(s.geoCity || s.geoCountry) && (
                              <span className="ml-1">
                                · {[s.geoCity, s.geoCountry].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="capitalize">{s.platform || 'web'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(s.lastActiveAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDetailSession(s)}
                                aria-label="View details"
                              >
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                              {!s.revoked && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-[rgb(239,68,68)] hover:bg-[rgb(239,68,68)]/10 hover:text-[rgb(239,68,68)]"
                                  onClick={() => setRevokeSession(s)}
                                  aria-label="Revoke session"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages} · {total} total
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!revokeSession} onOpenChange={() => setRevokeSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke session</DialogTitle>
            <DialogDescription>
              This will immediately log out the user from this device. User:{' '}
              {revokeSession?.userName ?? revokeSession?.userEmail}. Device: {revokeSession?.device}. IP:{' '}
              {revokeSession?.ip}. Last active: {revokeSession ? new Date(revokeSession.lastActiveAt).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeSession(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="bg-[rgb(239,68,68)] hover:bg-[rgb(239,68,68)]/90"
              onClick={() => revokeSession && revokeMutation.mutate(revokeSession.sessionId || revokeSession.id)}
              disabled={revokeMutation.isPending}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {detailSession && (
        <Dialog open={!!detailSession} onOpenChange={() => setDetailSession(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Session details</DialogTitle>
              <DialogDescription>
                {detailSession.device} · {detailSession.userName ?? detailSession.userEmail}
              </DialogDescription>
            </DialogHeader>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-muted-foreground">User</dt>
                <dd>{detailSession.userName ?? detailSession.userEmail ?? detailSession.userId}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">IP</dt>
                <dd className="font-mono">{detailSession.ip || '—'}</dd>
              </div>
              {(detailSession.geoCity || detailSession.geoCountry) && (
                <div>
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="flex items-center gap-1">
                    <Globe className="h-4 w-4" />
                    {[detailSession.geoCity, detailSession.geoCountry].filter(Boolean).join(', ')}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-muted-foreground">Platform</dt>
                <dd className="capitalize">{detailSession.platform || 'web'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Last active</dt>
                <dd>{new Date(detailSession.lastActiveAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(detailSession.createdAt).toLocaleString()}</dd>
              </div>
            </dl>
            {!detailSession.revoked && (
              <DialogFooter>
                <Button
                  variant="destructive"
                  className="bg-[rgb(239,68,68)] hover:bg-[rgb(239,68,68)]/90"
                  onClick={() => {
                    revokeMutation.mutate(detailSession.sessionId || detailSession.id)
                    setDetailSession(null)
                  }}
                  disabled={revokeMutation.isPending}
                >
                  Revoke session
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
