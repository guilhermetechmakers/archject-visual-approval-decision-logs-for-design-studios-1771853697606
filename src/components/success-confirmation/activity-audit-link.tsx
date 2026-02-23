import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActivityAuditLinkProps {
  label?: string
  onClick?: () => void
  to?: string
  className?: string
}

/**
 * Small link/button to view activity entry for the confirmed action.
 * Opens right-side panel or modal when implemented.
 */
export function ActivityAuditLink({
  label = 'View activity log',
  onClick,
  to,
  className,
}: ActivityAuditLinkProps) {
  const content = (
    <>
      <FileText className="h-4 w-4" />
      {label}
    </>
  )

  const baseClass = cn(
    'inline-flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#0052CC]',
    'focus:outline-none focus:ring-2 focus:ring-[#0052CC] focus:ring-offset-1 rounded',
    'min-h-[44px] sm:min-h-0 py-2 sm:py-0',
    className
  )

  if (to) {
    return (
      <a href={to} className={baseClass}>
        {content}
      </a>
    )
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {content}
    </button>
  )
}
