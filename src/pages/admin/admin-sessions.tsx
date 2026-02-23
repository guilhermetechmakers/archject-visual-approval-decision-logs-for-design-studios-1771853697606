import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
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
import { adminApi, type AdminSession } from '@/api/admin'
import { Trash2, RefreshCw } from 'lucide-react'

export function AdminSessionsPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [revokeSession, setRevokeSession] = useState<{
    sessionId: string
    userName?: string
    device: string
    ip: string
    lastActiveAt: string
  } | null>(null)
  const [revokeAllUser, setRevokeAllUser] = useState<{ userId: string; userName?: string } | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sessions', page],
    queryFn: () => adminApi.getSessions({ page }),
  })

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => adminApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      setRevokeSession(null)
      toast.success('Session revoked')
    },
    onError: () => toast.error('Failed to revoke session'),
  })

  const revokeAllMutation = useMutation({
    mutationFn: (userId: string) => adminApi.revokeAllSessions(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      setRevokeAllUser(null)
      toast.success('All sessions revoked')
    },
    onError: () => toast.error('Failed to revoke sessions'),
  })

  const sessions = data?.sessions ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / 20) || 1

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Sessions & Security</h1>
        <p className="mt-1 text-muted-foreground">
          Active sessions, token management, and security controls
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <p className="text-sm text-muted-foreground">
            Revoke individual sessions or force logout all sessions for a user
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-12">
              <RefreshCw className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No active sessions</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Admin sessions will appear here when logged in
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                    {sessions.map((s: AdminSession) => (
                    <TableRow key={s.sessionId}>
                      <TableCell className="font-medium">{s.userName ?? s.userId}</TableCell>
                      <TableCell>{s.device}</TableCell>
                      <TableCell>{s.ip}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(s.lastActiveAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setRevokeAllUser({ userId: s.userId, userName: s.userName })
                            }
                          >
                            Revoke all
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() =>
                              setRevokeSession({
                                sessionId: s.sessionId,
                                userName: s.userName,
                                device: s.device,
                                ip: s.ip,
                                lastActiveAt: s.lastActiveAt,
                              })
                            }
                            aria-label="Revoke session"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
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
              This will immediately log out the user from this device. User: {revokeSession?.userName ?? revokeSession?.device}.
              IP: {revokeSession?.ip}. Last active: {revokeSession ? new Date(revokeSession.lastActiveAt).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeSession(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeSession && revokeMutation.mutate(revokeSession.sessionId)}
              disabled={revokeMutation.isPending}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeAllUser} onOpenChange={() => setRevokeAllUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke all sessions for user</DialogTitle>
            <DialogDescription>
              This will log out {revokeAllUser?.userName ?? revokeAllUser?.userId} from all devices.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeAllUser(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeAllUser && revokeAllMutation.mutate(revokeAllUser.userId)}
              disabled={revokeAllMutation.isPending}
            >
              Revoke all
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
