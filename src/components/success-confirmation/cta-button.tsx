import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface CTAButtonProps {
  label: string
  onClick?: () => void
  to?: string
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  isLoading?: boolean
  icon?: ReactNode
  className?: string
}

/**
 * CTA button: primary (#0052CC solid) or secondary (outline).
 * Rounded corners, medium size. Min 44px height for mobile touch targets.
 */
export function CTAButton({
  label,
  onClick,
  to,
  variant = 'primary',
  disabled,
  isLoading,
  icon,
  className,
}: CTAButtonProps) {
  const variantProps = variant === 'primary' ? 'default' : 'outline'
  const content = (
    <>
      {icon}
      {label}
    </>
  )

  const buttonClass = cn(
    'inline-flex items-center justify-center gap-2 min-h-[44px] rounded-lg px-6 text-base font-medium',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    variant === 'primary' && 'bg-[#0052CC] hover:bg-[#0052CC]/90 text-white shadow-sm hover:shadow-md',
    variant === 'secondary' && 'border border-[#E5E7EB] bg-white hover:bg-muted text-[#6B7280]',
    className
  )

  if (to) {
    return (
      <Link to={to} className={buttonClass}>
        {content}
      </Link>
    )
  }

  return (
    <Button
      variant={variantProps}
      size="lg"
      onClick={onClick}
      disabled={disabled || isLoading}
      isLoading={isLoading}
      className={cn(buttonClass, 'min-h-[44px]')}
    >
      {content}
    </Button>
  )
}
