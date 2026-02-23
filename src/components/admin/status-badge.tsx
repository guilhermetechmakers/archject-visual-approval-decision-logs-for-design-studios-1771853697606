import { cn } from '@/lib/utils'

export type UserStatus = 'active' | 'suspended' | 'invited' | 'pending'

const statusConfig: Record<UserStatus, { label: string; className: string }> = {
  active: {
    label: 'Active',
    className: 'bg-[rgb(16,185,129)]/10 text-[rgb(16,185,129)] border-[rgb(16,185,129)]/20',
  },
  suspended: {
    label: 'Suspended',
    className: 'bg-[rgb(239,68,68)]/10 text-[rgb(239,68,68)] border-[rgb(239,68,68)]/20',
  },
  invited: {
    label: 'Invited',
    className: 'bg-[rgb(245,158,66)]/10 text-[rgb(245,158,66)] border-[rgb(245,158,66)]/20',
  },
  pending: {
    label: 'Pending',
    className: 'bg-[rgb(245,158,66)]/10 text-[rgb(245,158,66)] border-[rgb(245,158,66)]/20',
  },
}

export interface StatusBadgeProps {
  status: UserStatus | string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalized = (status?.toLowerCase() || 'active') as UserStatus
  const config = statusConfig[normalized] ?? statusConfig.active
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
