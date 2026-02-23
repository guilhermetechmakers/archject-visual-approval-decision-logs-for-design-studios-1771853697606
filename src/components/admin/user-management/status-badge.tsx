import { cn } from '@/lib/utils'

type Status = 'active' | 'suspended' | 'invited' | 'pending'

interface StatusBadgeProps {
  status: Status
  className?: string
}

const statusStyles: Record<Status, string> = {
  active: 'bg-[rgb(16,185,129)]/10 text-[rgb(16,185,129)]',
  suspended: 'bg-[rgb(239,68,68)]/10 text-[rgb(239,68,68)]',
  invited: 'bg-[rgb(245,158,66)]/10 text-[rgb(245,158,66)]',
  pending: 'bg-[rgb(245,158,66)]/10 text-[rgb(245,158,66)]',
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const label = status.charAt(0).toUpperCase() + status.slice(1)
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status] ?? 'bg-muted text-muted-foreground',
        className
      )}
    >
      {label}
    </span>
  )
}
