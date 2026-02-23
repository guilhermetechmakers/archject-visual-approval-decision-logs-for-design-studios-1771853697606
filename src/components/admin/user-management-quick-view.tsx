import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Users, UserPlus, UserX, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { adminApi, type AuditLogEntry } from '@/api/admin'

export function UserManagementQuickView() {
  const { data: auditData } = useQuery({
    queryKey: ['admin', 'audit-logs', { page: 1 }],
    queryFn: () => adminApi.getAuditLogs({ page: 1 }),
  })
  const pendingInvites = 0
  const suspendedCount = 0
  const recentLogs = auditData?.logs ?? []

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>User Management</CardTitle>
        <Link to="/admin/users">
          <Button variant="outline" size="sm">
            View all
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{pendingInvites} pending invites</span>
            </div>
            <div className="flex items-center gap-2">
              <UserX className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{suspendedCount} suspended</span>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-muted-foreground">Recent admin actions</p>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent actions</p>
            ) : (
              <ul className="space-y-2">
                {recentLogs.map((log: AuditLogEntry) => (
                  <li
                    key={log.id}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Activity className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span>
                      {log.action_type} on {log.target_type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Link to="/admin/users">
            <Button variant="secondary" size="sm" className="w-full">
              <Users className="mr-2 h-4 w-4" />
              Manage users
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
