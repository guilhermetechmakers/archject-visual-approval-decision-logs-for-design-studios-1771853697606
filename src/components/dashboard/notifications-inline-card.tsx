import { Link } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { cn } from '@/lib/utils'

export interface NotificationsInlineCardProps {
  items?: Array<{ id: string; title: string; message?: string; link?: string }>
  unreadCount?: number
  isLoading?: boolean
  className?: string
}

export function NotificationsInlineCard({
  items = [],
  unreadCount = 0,
  isLoading = false,
  className,
}: NotificationsInlineCardProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="font-medium">Notifications</span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              {unreadCount}
            </span>
          )}
        </div>
        <Link
          to="/dashboard/notifications"
          className="text-sm font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No new notifications
          </p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 3).map((item) => (
              <Link
                key={item.id}
                to={item.link ?? '/dashboard/notifications'}
                className="block rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <p className="text-sm font-medium">{item.title}</p>
                {item.message && (
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.message}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
