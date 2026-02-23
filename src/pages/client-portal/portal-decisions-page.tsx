import { useParams } from 'react-router-dom'
import { BrandingHeader, DecisionCardPanel } from '@/components/client-portal'
import { getClientDecisions, getClientBranding } from '@/api/client-portal'
import { useQuery } from '@tanstack/react-query'

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
      </div>
      <DecisionCardPanel
        decisions={list}
        token={token ?? ''}
        isLoading={isLoading}
      />
    </div>
  )
}
