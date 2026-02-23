import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type CTAButtonVariant = 'primary' | 'secondary' | 'ghost'

export interface CTAButtonProps {
  label: string
  onClick: () => void
  variant?: CTAButtonVariant
  isLoading?: boolean
  disabled?: boolean
  className?: string
  icon?: React.ReactNode
}

export function CTAButton({
  label,
  onClick,
  variant = 'primary',
  isLoading = false,
  disabled = false,
  className,
  icon,
}: CTAButtonProps) {
  const buttonVariant =
    variant === 'primary'
      ? 'default'
      : variant === 'secondary'
        ? 'outline'
        : 'ghost'

  return (
    <Button
      variant={buttonVariant}
      onClick={onClick}
      isLoading={isLoading}
      disabled={disabled}
      className={cn(
        'min-h-[44px] rounded-lg px-6 transition-all duration-200 hover:scale-[1.02] hover:shadow-md active:scale-[0.98]',
        variant === 'primary' && 'bg-[rgb(0,82,204)] text-white hover:bg-[rgb(0,82,204)]/90',
        className
      )}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </Button>
  )
}
