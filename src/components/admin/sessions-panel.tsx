import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Shield, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { adminApi, type AdminSession } from '@/api/admin'
import { toast } from 'sonner'

export function SessionsPanel() {
  const queryClient = useQueryClient()
  const [revokeTarget, setRevokeTarget] = useState<AdminSession | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'sessions'],
    queryFn: () => adminApi.getSessions({ page: 1 }),
  })

  const revokeMutation = useMutation({
    mutationFn: (sessionId: string) => adminApi.revokeSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'sessions'] })
      setRevokeTarget(null)
      toast.success('Session revoked')
    },
    onError: () => toast.error('Failed to revoke session'),
  })

  const sessions = data?.sessions ?? []

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Sessions & Security</CardTitle>
          <Link to="/admin/sessions">
            <Button variant="outline" size="sm">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground" />
              <p className="mt-2 font-medium">No active sessions</p>
              <p className="text-sm text-muted-foreground">
                Admin sessions will appear here when admins are logged in
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.slice(0, 5).map((s) => (
                    <TableRow key={s.sessionId}>
                      <TableCell className="font-medium">{s.userId.slice(0, 8)}...</TableCell>
                      <TableCell>{s.device}</TableCell>
                      <TableCell>{s.ip}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(s.lastActiveAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setRevokeTarget(s)}
                          aria-label="Revoke session"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent onClose={() => setRevokeTarget(null)} showClose={true}>
          <DialogHeader>
            <DialogTitle>Revoke session</DialogTitle>
            <DialogDescription>
              {revokeTarget && (
                <>
                  This will immediately log out the user from this device ({revokeTarget.device}, {revokeTarget.ip}).
                  Last active: {new Date(revokeTarget.lastActiveAt).toLocaleString()}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => revokeTarget && revokeMutation.mutate(revokeTarget.sessionId)}
              disabled={revokeMutation.isPending}
            >
              Revoke
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
