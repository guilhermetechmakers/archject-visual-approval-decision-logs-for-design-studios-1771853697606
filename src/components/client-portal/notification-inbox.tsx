import { useQuery } from '@tanstack/react-query'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { getClientNotifications } from '@/api/client-portal'
import { cn } from '@/lib/utils'

export interface NotificationInboxProps {
  token: string
  className?: string
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function NotificationInbox({ token, className }: NotificationInboxProps) {
  const { data: notifications = [] } = useQuery({
    queryKey: ['client-notifications', token],
    queryFn: () => getClientNotifications(token),
    enabled: !!token,
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('relative', className)}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5 text-[rgb(107,114,128)]" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(239,68,68)] text-[10px] font-medium text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-[rgb(107,114,128)]">
            No notifications yet
          </div>
        ) : (
          notifications.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex flex-col items-start gap-1 py-3"
            >
              <p className={cn('text-sm', !n.read && 'font-medium')}>
                {n.message}
              </p>
              <span className="text-xs text-[rgb(107,114,128)]">
                {formatTimestamp(n.createdAt)}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
