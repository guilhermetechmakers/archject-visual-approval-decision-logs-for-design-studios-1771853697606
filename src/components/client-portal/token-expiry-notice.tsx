import { AlertCircle, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TokenExpiryNoticeProps {
  expiresAt?: string | null
  message?: string
  variant?: 'info' | 'warning' | 'error'
  className?: string
}

export function TokenExpiryNotice({
  expiresAt,
  message,
  variant = 'info',
  className,
}: TokenExpiryNoticeProps) {
  const isExpiringSoon = expiresAt
    ? new Date(expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000
    : false

  const variantStyles = {
    info: 'bg-[rgb(243,244,246)] text-[rgb(107,114,128)] border-[rgb(229,231,235)]',
    warning: 'bg-[rgb(245,158,66)]/10 text-[rgb(245,158,66)] border-[rgb(245,158,66)]/30',
    error: 'bg-[rgb(239,68,68)]/10 text-[rgb(239,68,68)] border-[rgb(239,68,68)]/30',
  }

  const displayMessage =
    message ??
    (isExpiringSoon && expiresAt
      ? `This link expires soon (${new Date(expiresAt).toLocaleDateString()})`
      : 'Your approval will be time-stamped and recorded. No login required.')

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 text-xs',
        variantStyles[variant],
        className
      )}
      role="status"
      aria-live="polite"
    >
      {variant === 'error' ? (
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Shield className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span>{displayMessage}</span>
    </div>
  )
}
