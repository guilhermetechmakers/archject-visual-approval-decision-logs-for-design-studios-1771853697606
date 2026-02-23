import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActivityAuditLinkProps {
  label?: string
  onClick: () => void
  className?: string
}

export function ActivityAuditLink({
  label = 'View activity log',
  onClick,
  className,
}: ActivityAuditLinkProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 text-sm text-[rgb(107,114,128)] transition-colors',
        'hover:text-[rgb(0,82,204)] focus:outline-none focus:ring-2 focus:ring-[rgb(0,82,204)] focus:ring-offset-1 focus:ring-offset-[#F7F7F9]',
        'min-h-[44px] min-w-[44px items-center justify-center rounded-lg px-2 py-1 sm:min-h-0 sm:min-w-0',
        className
      )}
    >
      <FileText className="h-4 w-4" />
      {label}
    </button>
  )
}
