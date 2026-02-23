import { DecisionCardItem } from './decision-card-item'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { PortalDecision } from '@/types/portal'

export interface DecisionCardPanelProps {
  decisions: PortalDecision[]
  token: string
  isLoading?: boolean
  className?: string
}

export function DecisionCardPanel({
  decisions,
  token,
  isLoading,
  className,
}: DecisionCardPanelProps) {
  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-xl" />
        ))}
      </div>
    )
  }

  if (decisions.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border border-[rgb(229,231,235)] bg-[#FFFFFF] py-16 text-center',
          className
        )}
      >
        <p className="font-medium text-[rgb(17,24,39)]">No decisions yet</p>
        <p className="mt-1 text-sm text-[rgb(107,114,128)]">
          Decisions will appear here when shared with you.
        </p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      {decisions.map((decision) => (
        <DecisionCardItem
          key={decision.id}
          decision={decision}
          token={token}
        />
      ))}
    </div>
  )
}
