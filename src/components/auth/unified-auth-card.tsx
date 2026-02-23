import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface UnifiedAuthCardProps {
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function UnifiedAuthCard({ title, description, children, className }: UnifiedAuthCardProps) {
  return (
    <Card
      className={cn(
        'w-full max-w-[420px] rounded-xl border border-[#E5E7EB] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
        'transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)]',
        'py-7 px-6',
        className
      )}
    >
      <CardHeader className="p-0 pb-6">
        <CardTitle className="text-center text-[28px] font-semibold">{title}</CardTitle>
        {description && (
          <CardDescription className="text-center text-[15px] mt-2">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="p-0 space-y-6">{children}</CardContent>
    </Card>
  )
}

interface AuthCardHeaderProps {
  title?: string
}

export function AuthCardHeader({ title = 'Archject' }: AuthCardHeaderProps) {
  return (
    <Link
      to="/"
      className="mb-8 block text-center text-xl font-bold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg"
      aria-label="Archject home"
    >
      {title}
    </Link>
  )
}

interface AuthCardFooterProps {
  children: ReactNode
  className?: string
}

export function AuthCardFooter({ children, className }: AuthCardFooterProps) {
  return (
    <p className={cn('text-center text-xs text-muted-foreground', className)}>
      {children}
    </p>
  )
}
