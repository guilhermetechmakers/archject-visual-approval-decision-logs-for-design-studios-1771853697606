import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Shield,
  Monitor,
  Unplug,
  LogOut,
  ChevronRight,
  MapPin,
  Globe,
  Smartphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetClose,
} from '@/components/ui/sheet'
import { Select } from '@/components/ui/select'
import { getMe, revokeSession, revokeAllSessions } from '@/api/users'
import type { UserProfile } from '@/api/users'

const REVOKE_REASONS = [
  { value: 'lost_device', label: 'Lost or stolen device' },
  { value: 'suspicious', label: 'Suspicious activity' },
  { value: 'forgot_logout', label: 'Forgot to sign out' },
  { value: 'other', label: 'Other' },
]

function formatUserAgent(ua: string | null): string {
  if (!ua) return 'Unknown device'
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari'
  if (ua.includes('Edg')) return 'Edge'
  return 'Browser'
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
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

interface SessionDetailSheetProps {
  session: UserProfile['sessions'][0] | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRevoke: (id: string) => void
}

function SessionDetailSheet({ session, open, onOpenChange, onRevoke }: SessionDetailSheetProps) {
  if (!session) return null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md sm:max-w-lg">
        <SheetClose />
        <SheetHeader>
          <SheetTitle>Session details</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {session.device_name || formatUserAgent(session.user_agent)}
          </p>
        </SheetHeader>
        <SheetBody>
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Device</dt>
              <dd className="mt-1">{session.device_name || formatUserAgent(session.user_agent)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">IP address</dt>
              <dd className="mt-1 font-mono text-sm">{session.ip || '—'}</dd>
            </div>
            {(session.geo_city || session.geo_country) && (
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                <dd className="mt-1 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {[session.geo_city, session.geo_country].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Platform</dt>
              <dd className="mt-1 capitalize">{session.platform || 'web'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Last active</dt>
              <dd className="mt-1">{formatRelativeTime(session.last_active_at)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-muted-foreground">Created</dt>
              <dd className="mt-1">{new Date(session.created_at).toLocaleString()}</dd>
            </div>
          </dl>
          <div className="mt-4 pt-4 border-t border-border">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                onRevoke(session.id)
                onOpenChange(false)
              }}
            >
              <Unplug className="mr-2 h-4 w-4" />
              End this session
            </Button>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

export function SecuritySessionsCard() {
  const queryClient = useQueryClient()
  const [detailSession, setDetailSession] = useState<UserProfile['sessions'][0] | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<{
    session: UserProfile['sessions'][0]
    reason?: string
  } | null>(null)
  const [revokeAllOpen, setRevokeAllOpen] = useState(false)
  const [revokeAllPassword, setRevokeAllPassword] = useState('')

  const { data: profile, isLoading } = useQuery({
    queryKey: ['user-profile'],
    queryFn: getMe,
  })

  const revokeMutation = useMutation({
    mutationFn: ({ sessionId, reason }: { sessionId: string; reason?: string }) =>
      revokeSession(sessionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      setRevokeTarget(null)
      setDetailSession(null)
      toast.success('Session signed out')
    },
    onError: () => toast.error('Failed to revoke session'),
  })

  const revokeAllMutation = useMutation({
    mutationFn: revokeAllSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-profile'] })
      setRevokeAllOpen(false)
      setRevokeAllPassword('')
      toast.success('Signed out of all devices')
    },
    onError: (err: { message?: string }) =>
      toast.error((err as { message?: string })?.message ?? 'Failed to sign out'),
  })

  const handleRevokeSession = (sessionId: string) => {
    const session = profile?.sessions.find((s) => s.id === sessionId)
    if (session) setRevokeTarget({ session })
  }

  if (isLoading || !profile) {
    return (
      <Card className="card-hover">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  const sessions = profile.sessions

  return (
    <>
      <Card className="card-hover">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security & Sessions
          </CardTitle>
          <CardDescription>
            Manage your active sessions and sign out from other devices. View session details and revoke access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium">Active sessions</h4>
              {sessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setRevokeAllOpen(true)}
                >
                  <LogOut className="mr-1 h-4 w-4" />
                  Sign out of all devices
                </Button>
              )}
            </div>

            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
                <Monitor className="h-12 w-12 text-muted-foreground" />
                <p className="mt-4 font-medium">No active sessions</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Your sessions will appear here when you sign in
                </p>
              </div>
            ) : (
              <>
                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="text-left font-medium p-4">Device</th>
                        <th className="text-left font-medium p-4">IP · Location</th>
                        <th className="text-left font-medium p-4">Last active</th>
                        <th className="text-left font-medium p-4">Platform</th>
                        <th className="text-right font-medium p-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.map((s) => (
                        <tr
                          key={s.id}
                          className="border-b border-border last:border-0 transition-colors hover:bg-muted/20"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              {getPlatformIcon(s.platform)}
                              <span className="font-medium">
                                {s.device_name || formatUserAgent(s.user_agent)}
                              </span>
                            </div>
                          </td>
                          <td className="p-4 text-muted-foreground">
                            {s.ip ?? '—'}
                            {(s.geo_city || s.geo_country) && (
                              <span className="ml-1">
                                · {[s.geo_city, s.geo_country].filter(Boolean).join(', ')}
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-muted-foreground">{formatRelativeTime(s.last_active_at)}</td>
                          <td className="p-4 capitalize">{s.platform || 'web'}</td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDetailSession(s)}
                                className="text-muted-foreground"
                              >
                                Details
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeSession(s.id)}
                                className="text-[rgb(239,68,68)] hover:bg-[rgb(239,68,68)]/10 hover:text-[rgb(239,68,68)]"
                              >
                                <Unplug className="mr-1 h-4 w-4" />
                                Revoke
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Mobile: cards */}
                <div className="md:hidden space-y-3">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col gap-3 rounded-lg border border-[rgb(229,231,235)] p-4 shadow-sm transition-all duration-200 hover:shadow-md"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                          {getPlatformIcon(s.platform)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {s.device_name || formatUserAgent(s.user_agent)}
                          </p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                            {s.ip ?? 'Unknown IP'}
                            {(s.geo_city || s.geo_country) && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-0.5">
                                  <Globe className="h-3.5 w-3" />
                                  {[s.geo_city, s.geo_country].filter(Boolean).join(', ')}
                                </span>
                              </>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Last active {formatRelativeTime(s.last_active_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setDetailSession(s)}
                        >
                          <ChevronRight className="mr-1 h-4 w-4" />
                          Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRevokeSession(s.id)}
                          className="flex-1 text-[rgb(239,68,68)] hover:bg-[rgb(239,68,68)]/10 hover:text-[rgb(239,68,68)]"
                        >
                          <Unplug className="mr-1 h-4 w-4" />
                          Revoke
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-muted-foreground">Two-factor authentication</p>
            <p className="mt-1 text-sm">
              {profile.two_fa_enabled
                ? `2FA: Enabled (${profile.two_fa_method === 'sms' ? `SMS to ${profile.phone_masked ?? '***'}` : 'Authenticator app'})`
                : 'Add an extra layer of security with an authenticator app or SMS.'}
            </p>
            <a href="/dashboard/settings/profile#2fa" className="mt-2 inline-block text-sm text-[rgb(0,82,204)] hover:underline">
              Manage 2FA →
            </a>
          </div>
        </CardContent>
      </Card>

      <SessionDetailSheet
        session={detailSession}
        open={!!detailSession}
        onOpenChange={(open) => !open && setDetailSession(null)}
        onRevoke={(id) => handleRevokeSession(id)}
      />

      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent onClose={() => setRevokeTarget(null)}>
          <DialogHeader>
            <DialogTitle>End session</DialogTitle>
            <DialogDescription>
              This will immediately sign out this device. Device:{' '}
              {revokeTarget?.session.device_name || formatUserAgent(revokeTarget?.session.user_agent ?? null)}.
              IP: {revokeTarget?.session.ip ?? '—'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revoke-reason">Reason (optional)</Label>
            <Select
              value={revokeTarget?.reason ?? ''}
              onValueChange={(v) =>
                setRevokeTarget((p) => (p ? { ...p, reason: v } : null))
              }
              options={REVOKE_REASONS.map((r) => ({ value: r.value, label: r.label }))}
              placeholder="Select a reason"
              id="revoke-reason"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                revokeTarget &&
                revokeMutation.mutate({
                  sessionId: revokeTarget.session.id,
                  reason: revokeTarget.reason || undefined,
                } as { sessionId: string; reason?: string })
              }
              disabled={revokeMutation.isPending}
            >
              End session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
        <DialogContent onClose={() => setRevokeAllOpen(false)}>
          <DialogHeader>
            <DialogTitle>Sign out of all devices</DialogTitle>
            <DialogDescription>
              This will immediately sign you out from all devices. Enter your password to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="revoke-all-password">Password</Label>
            <Input
              id="revoke-all-password"
              type="password"
              placeholder="Enter your password"
              value={revokeAllPassword}
              onChange={(e) => setRevokeAllPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeAllOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeAllMutation.mutate(revokeAllPassword)}
              disabled={!revokeAllPassword || revokeAllMutation.isPending}
            >
              Sign out all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
