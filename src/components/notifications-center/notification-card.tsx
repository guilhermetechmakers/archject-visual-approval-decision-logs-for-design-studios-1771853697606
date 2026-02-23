import { Link, useNavigate } from 'react-router-dom'
import { MoreHorizontal, ExternalLink, Paperclip, Check, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import type { NotificationCenterItem, NotificationType } from '@/types'

const TYPE_CONFIG: Record<NotificationType, { label: string; variant: 'default' | 'success' | 'warning' | 'destructive' }> = {
  reminder: { label: 'Reminder', variant: 'warning' },
  approval: { label: 'Approval', variant: 'success' },
  comment: { label: 'Comment', variant: 'default' },
  export: { label: 'Export', variant: 'default' },
}

function formatTimeAgo(dateStr: string): string {
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

export interface NotificationCardProps {
  notification: NotificationCenterItem
  selected?: boolean
  isSelected?: boolean
  onSelect?: (id: string) => void
  onMarkRead?: (id: string) => void
  onMarkUnread?: (id: string) => void
  showCheckbox?: boolean
}

export function NotificationCard({
  notification,
  selected,
  isSelected,
  onSelect,
  onMarkRead,
  onMarkUnread,
  showCheckbox,
}: NotificationCardProps) {
  const navigate = useNavigate()
  const config = TYPE_CONFIG[notification.type]
  const isUnread = !notification.readAt
  const isSelectedState = selected ?? isSelected
  const link = notification.relatedDecisionId && notification.relatedProjectId
    ? `/dashboard/projects/${notification.relatedProjectId}/decisions/${notification.relatedDecisionId}`
    : notification.relatedProjectId
      ? `/dashboard/projects/${notification.relatedProjectId}`
      : undefined

  return (
    <Card
      className={cn(
        'card-hover transition-all duration-200',
        isUnread && 'border-primary/20 bg-primary/5',
        isSelectedState && 'ring-2 ring-primary'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {showCheckbox && onSelect && (
            <input
              type="checkbox"
              checked={!!(selected ?? isSelected)}
              onChange={() => onSelect(notification.id)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-input"
              aria-label={`Select ${notification.title}`}
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {isUnread && (
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                  <h3
                    className={cn(
                      'text-[15px] leading-tight',
                      isUnread ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground'
                    )}
                  >
                    {notification.title}
                  </h3>
                  <Badge variant={config.variant} className="shrink-0 text-xs">
                    {config.label}
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {notification.message}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTimeAgo(notification.createdAt)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isUnread ? (
                      <DropdownMenuItem onClick={() => onMarkRead?.(notification.id)}>
                        <Check className="h-4 w-4 mr-2" />
                        Mark as read
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => onMarkUnread?.(notification.id)}>
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Mark as unread
                      </DropdownMenuItem>
                    )}
                    {link && (
                      <DropdownMenuItem onClick={() => navigate(link)}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open decision
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {(notification.attachments?.length ?? 0) > 0 && (
              <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                <Paperclip className="h-3.5 w-3.5" />
                {(notification.attachments ?? []).length} attachment(s)
              </div>
            )}
            {link && (
              <Link
                to={link}
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline font-medium"
              >
                View decision
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
