import { useParams } from 'react-router-dom'
import { BrandingHeader, DecisionCardPanel } from '@/components/client-portal'
import { getClientDecisions, getClientBranding } from '@/api/client-portal'
import { useQuery } from '@tanstack/react-query'
import { cn } from '@/lib/utils'

export function PortalDecisionsPage() {
  const { token } = useParams<{ token: string }>()

  const { data: decisions = [], isLoading } = useQuery({
    queryKey: ['client-decisions', token],
    queryFn: () => getClientDecisions(token!),
    enabled: !!token,
  })

  const { data: branding } = useQuery({
    queryKey: ['client-branding', token],
    queryFn: () => getClientBranding(token!),
    enabled: !!token,
  })

  const list = Array.isArray(decisions) ? decisions : decisions ? [decisions] : []
  const approvedCount = list.filter((d) => d.status === 'approved').length
  const totalCount = list.length
  const progressPercent = totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-6 animate-in-up">
      <BrandingHeader
        branding={branding ?? null}
        instructions="Review the decisions below and approve your selections. You can add comments or questions before approving."
      />
      <div>
        <h1 className="text-xl font-semibold text-[rgb(17,24,39)]">
          Decisions to review
        </h1>
        <p className="mt-1 text-sm text-[rgb(107,114,128)]">
          {list.length > 0
            ? `You have ${list.length} decision${list.length !== 1 ? 's' : ''} to review.`
            : 'Select a decision below to view details and approve.'}
        </p>
        {totalCount > 0 && (
          <div className="mt-3" role="progressbar" aria-valuenow={progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Review progress">
            <div className="h-2 w-full overflow-hidden rounded-full bg-[rgb(229,231,235)]">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-300',
                  progressPercent === 100 ? 'bg-[rgb(16,185,129)]' : 'bg-[rgb(0,82,204)]'
                )}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-1 text-xs text-[rgb(107,114,128)]">
              {approvedCount} of {totalCount} approved
            </p>
          </div>
        )}
      </div>
      <DecisionCardPanel
        decisions={list}
        token={token ?? ''}
        isLoading={isLoading}
      />
    </div>
  )
}
