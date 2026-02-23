import { useNavigate } from 'react-router-dom'
import { Check, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PortalDecision } from '@/types/portal'

export interface DecisionCardItemProps {
  decision: PortalDecision
  token: string
  className?: string
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: 'medium',
    })
  } catch {
    return iso
  }
}

export function DecisionCardItem({ decision, token, className }: DecisionCardItemProps) {
  const navigate = useNavigate()
  const isApproved = decision.status === 'approved'
  const approvedOption = decision.options.find(
    (o) => o.id === decision.approvedOptionId || o.selected
  )

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5',
        'border-[rgb(229,231,235)] bg-[#FFFFFF] shadow-card',
        className
      )}
      onClick={() => navigate(`/client/${token}/decision/${decision.id}`)}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
        <h3 className="text-base font-semibold text-[rgb(17,24,39)] line-clamp-2">
          {decision.title}
        </h3>
        <Badge
          variant={isApproved ? 'success' : 'warning'}
          className="shrink-0"
        >
          {isApproved ? 'Approved' : 'Pending'}
        </Badge>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-2">
          {decision.options.slice(0, 3).map((opt) => (
            <span
              key={opt.id}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs',
                opt.id === approvedOption?.id
                  ? 'bg-[rgb(16,185,129)]/10 text-[rgb(16,185,129)]'
                  : 'bg-[rgb(243,244,246)] text-[rgb(107,114,128)]'
              )}
            >
              {opt.id === approvedOption?.id && (
                <Check className="h-3 w-3" aria-hidden />
              )}
              {opt.label}
            </span>
          ))}
          {decision.options.length > 3 && (
            <span className="text-xs text-[rgb(107,114,128)]">
              +{decision.options.length - 3} more
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-[rgb(107,114,128)]">
          <span>Updated {formatDate(decision.updatedAt)}</span>
          <ChevronRight className="h-4 w-4" aria-hidden />
        </div>
      </CardContent>
    </Card>
  )
}
