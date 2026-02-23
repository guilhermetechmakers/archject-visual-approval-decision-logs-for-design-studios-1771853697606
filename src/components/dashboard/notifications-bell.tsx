import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

export function NotificationsBell() {
  const { data } = useQuery({
    queryKey: ['dashboard-notifications-summary'],
    queryFn: () =>
      api.get<{ unreadCount: number }>('/notifications/summary').catch(() => ({ unreadCount: 0 })),
    staleTime: 30 * 1000,
  })

  const unreadCount = data?.unreadCount ?? 0

  return (
    <Link
      to="/dashboard/notifications"
      aria-label="Notifications"
      className={cn(
        'relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
        'hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
      )}
    >
      <Bell className="h-5 w-5 text-muted-foreground" />
      {unreadCount > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground"
          aria-hidden
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </Link>
  )
}
