import { Link } from 'react-router-dom'
import { CheckCircle2, MessageSquare, Download, FileCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { DashboardActivityItem } from '@/api/dashboard'

export interface RecentActivityFeedProps {
  items: DashboardActivityItem[]
  isLoading?: boolean
  className?: string
}

function getActionIcon(action: string) {
  switch (action) {
    case 'approved':
      return CheckCircle2
    case 'commented':
      return MessageSquare
    case 'exported':
      return Download
    default:
      return FileCheck
  }
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso)
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

export function RecentActivityFeed({
  items,
  isLoading = false,
  className,
}: RecentActivityFeedProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Approvals, comments, and exports</CardDescription>
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
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-48 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No activity yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Activity will appear here as decisions are approved or commented
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.slice(0, 5).map((item) => {
              const Icon = getActionIcon(item.action)
              return (
                <div
                  key={item.id}
                  className="flex gap-3 transition-colors hover:bg-muted/50 -mx-2 rounded-lg px-2 py-1.5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{item.actorName}</span>
                      {' '}
                      <span className="text-muted-foreground">{item.action}</span>
                      {' '}
                      {item.targetTitle && (
                        <Link
                          to={item.projectId
                            ? `/dashboard/projects/${item.projectId}/decisions/${item.targetId}`
                            : '#'}
                          className="text-primary hover:underline"
                        >
                          {item.targetTitle}
                        </Link>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.projectName && `${item.projectName} · `}
                      {formatTimestamp(item.timestamp)}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
