import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PortalAuditLogEntry } from '@/types/portal'

export interface ActivityTimelineProps {
  entries: PortalAuditLogEntry[]
  decisionCreatedAt?: string
  decisionApprovedAt?: string
  approvedByName?: string
  className?: string
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function ActivityTimeline({
  entries,
  decisionCreatedAt,
  decisionApprovedAt,
  approvedByName,
  className,
}: ActivityTimelineProps) {
  const items: { label: string; timestamp: string; variant?: 'default' | 'success' }[] = []

  if (decisionCreatedAt) {
    items.push({
      label: 'Decision created',
      timestamp: decisionCreatedAt,
      variant: 'default',
    })
  }

  entries.forEach((e) => {
    items.push({
      label: e.action.replace(/_/g, ' '),
      timestamp: e.timestamp,
      variant: e.action.includes('approv') ? 'success' : 'default',
    })
  })

  if (decisionApprovedAt) {
    const hasApprovalEntry = items.some((i) => i.label.toLowerCase().includes('approv'))
    if (!hasApprovalEntry) {
      items.push({
        label: approvedByName ? `Approved by ${approvedByName}` : 'Approved',
        timestamp: decisionApprovedAt,
        variant: 'success',
      })
    }
  }

  if (items.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-[rgb(229,231,235)] py-8 text-center',
          className
        )}
      >
        <Clock className="h-10 w-10 text-[rgb(107,114,128)]" />
        <p className="mt-2 text-sm text-[rgb(107,114,128)]">No activity yet</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-[rgb(107,114,128)]" />
        <h4 className="text-sm font-medium text-[rgb(17,24,39)]">Activity</h4>
      </div>
      <div className="space-y-0">
        {items.map((item, i) => (
          <div key={i} className="flex gap-3">
            <div
              className={cn(
                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                item.variant === 'success'
                  ? 'bg-[rgb(16,185,129)]'
                  : 'bg-[rgb(0,82,204)]'
              )}
              aria-hidden
            />
            <div className="pb-4">
              <p className="text-sm font-medium text-[rgb(17,24,39)]">
                {item.label}
              </p>
              <p className="text-xs text-[rgb(107,114,128)]">
                {formatTimestamp(item.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
