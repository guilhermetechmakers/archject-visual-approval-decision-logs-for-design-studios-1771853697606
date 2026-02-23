import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type VerificationCardVariant = 'success' | 'error' | 'neutral'

export interface VerificationCardProps {
  variant: VerificationCardVariant
  title: string
  description: string
  badge?: string
  children?: ReactNode
  /** ARIA-live region for status updates */
  statusMessage?: string
  className?: string
}

const variantConfig = {
  success: {
    icon: CheckCircle2,
    iconBg: 'bg-[#10B981]/10',
    iconColor: 'text-[#10B981]',
    badgeVariant: 'success' as const,
  },
  error: {
    icon: XCircle,
    iconBg: 'bg-[#EF4444]/10',
    iconColor: 'text-[#EF4444]',
    badgeVariant: 'destructive' as const,
  },
  neutral: {
    icon: Loader2,
    iconBg: 'bg-muted',
    iconColor: 'text-muted-foreground',
    badgeVariant: 'secondary' as const,
  },
}

export function VerificationCard({
  variant,
  title,
  description,
  badge,
  children,
  statusMessage,
  className,
}: VerificationCardProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <Card
      className={cn(
        'w-full max-w-[420px] rounded-[10px] border border-[#E5E7EB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
        'transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
        className
      )}
      role="region"
      aria-label={title}
    >
      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="sr-only"
        >
          {statusMessage}
        </div>
      )}
      <CardHeader className="space-y-4 pb-4">
        <div
          className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full',
            config.iconBg
          )}
        >
          <Icon
            className={cn(
              'h-6 w-6',
              config.iconColor,
              variant === 'neutral' && 'animate-spin'
            )}
            aria-hidden
          />
        </div>
        {badge && (
          <Badge
            variant={config.badgeVariant}
            className="mx-auto w-fit"
          >
            {badge}
          </Badge>
        )}
        <CardTitle className="text-center text-[22px] font-semibold text-[#111827]">
          {title}
        </CardTitle>
        <CardDescription className="text-center text-[15px] text-[#6B7280]">
          {description}
        </CardDescription>
      </CardHeader>
      {children && (
        <CardContent className="space-y-4 pt-0">
          {children}
        </CardContent>
      )}
    </Card>
  )
}

export interface VerificationCardAction {
  label: string
  href?: string
  onClick?: () => void
  variant?: 'default' | 'outline' | 'ghost'
  className?: string
  autoFocus?: boolean
}

export function VerificationCardActions({
  primary,
  secondary,
}: {
  primary?: VerificationCardAction
  secondary?: VerificationCardAction
}) {
  const primaryBtn = primary ? (
    primary.href ? (
      <Link to={primary.href} className="block">
        <Button
          className={cn(
            'w-full',
            primary.variant === 'default' && 'bg-[#0052CC] hover:bg-[#0052CC]/90 text-white',
            primary.className
          )}
          variant={primary.variant ?? 'default'}
          onClick={primary.onClick}
          autoFocus={primary.autoFocus}
        >
          {primary.label}
        </Button>
      </Link>
    ) : (
      <Button
        className={cn(
          'w-full',
          primary.variant === 'default' && 'bg-[#0052CC] hover:bg-[#0052CC]/90 text-white',
          primary.className
        )}
        variant={primary.variant ?? 'default'}
        onClick={primary.onClick}
        autoFocus={primary.autoFocus}
      >
        {primary.label}
      </Button>
    )
  ) : null

  const secondaryBtn = secondary ? (
    secondary.href ? (
      <Link to={secondary.href} className="block">
        <Button
          variant="outline"
          className="w-full border-[#D1D5DB] text-[#6B7280] hover:bg-muted/50"
          onClick={secondary.onClick}
        >
          {secondary.label}
        </Button>
      </Link>
    ) : (
      <Button
        variant="outline"
        className="w-full border-[#D1D5DB] text-[#6B7280] hover:bg-muted/50"
        onClick={secondary.onClick}
      >
        {secondary.label}
      </Button>
    )
  ) : null

  return (
    <div className="space-y-3">
      {primaryBtn}
      {secondaryBtn}
    </div>
  )
}
