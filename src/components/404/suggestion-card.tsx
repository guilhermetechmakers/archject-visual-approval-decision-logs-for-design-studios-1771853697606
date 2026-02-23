import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

export interface SuggestionCardProps {
  to: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  className?: string
}

export function SuggestionCard({ to, icon: Icon, title, description, className }: SuggestionCardProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-start gap-4 rounded-lg border border-border bg-card p-4 transition-all duration-200',
        'hover:border-primary/30 hover:bg-muted/50 hover:shadow-card-hover hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <span className="font-semibold text-foreground">{title}</span>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
      </div>
    </Link>
  )
}
