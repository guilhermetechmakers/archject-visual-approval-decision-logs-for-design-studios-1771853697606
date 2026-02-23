import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Notification } from '@/types'

const mockNotifications: Notification[] = [
  { id: '1', title: 'Approval received', message: 'Material selection approved for Riverside Residence', read: false, createdAt: new Date().toISOString(), link: '/dashboard/projects/1/decisions/1' },
  { id: '2', title: 'Reminder sent', message: 'Reminder sent to client for layout options', read: true, createdAt: new Date().toISOString() },
]

export function NotificationsPage() {
  const { data: notifications = mockNotifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications').catch(() => mockNotifications),
  })

  return (
    <div className="space-y-8 animate-in">
      <div>
        <h1 className="text-2xl font-bold">Notifications</h1>
        <p className="mt-1 text-muted-foreground">View and manage your notifications</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Feed
          </CardTitle>
          <Button variant="outline" size="sm">Mark all read</Button>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No notifications</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Notifications will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start justify-between rounded-lg border p-4 ${
                    n.read ? 'border-border bg-muted/30' : 'border-primary/20 bg-primary/5'
                  }`}
                >
                  <div>
                    <p className="font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
