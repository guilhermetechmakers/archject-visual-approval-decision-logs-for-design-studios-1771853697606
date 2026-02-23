import { cn } from '@/lib/utils'

interface RolePillProps {
  role: string
  className?: string
}

export function RolePill({ role, className }: RolePillProps) {
  const label = role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium bg-primary/10 text-primary',
        className
      )}
    >
      {label}
    </span>
  )
}
