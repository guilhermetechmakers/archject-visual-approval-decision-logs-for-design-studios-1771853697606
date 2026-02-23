import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationCard } from './notification-card'
import { Skeleton } from '@/components/ui/skeleton'
import type { NotificationCenterItem } from '@/types'

export interface FeedListProps {
  notifications: NotificationCenterItem[]
  isLoading?: boolean
  selectedIds: string[]
  onSelect?: (id: string) => void
  onMarkRead?: (id: string) => void
  onMarkUnread?: (id: string) => void
  showCheckbox?: boolean
  className?: string
}

export function FeedList({
  notifications,
  isLoading,
  selectedIds,
  onSelect,
  onMarkRead,
  onMarkUnread,
  showCheckbox,
  className,
}: FeedListProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-3', className)}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-16 px-6 rounded-xl border border-dashed border-border bg-muted/30',
          className
        )}
      >
        <Bell className="h-12 w-12 text-muted-foreground" aria-hidden />
        <p className="mt-4 font-medium text-foreground">No notifications</p>
        <p className="mt-1 text-sm text-muted-foreground text-center max-w-sm">
          Notifications for reminders, approvals, comments, and exports will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-3', className)} role="list">
      {notifications.map((n, i) => (
        <div
          key={n.id}
          className="animate-in"
          style={{ animationDelay: `${i * 0.05}s` } as React.CSSProperties}
          role="listitem"
        >
          <NotificationCard
            notification={n}
            selected={selectedIds.includes(n.id)}
            onSelect={onSelect}
            onMarkRead={onMarkRead}
            onMarkUnread={onMarkUnread}
            showCheckbox={showCheckbox ?? !!onSelect}
          />
        </div>
      ))}
    </div>
  )
}
