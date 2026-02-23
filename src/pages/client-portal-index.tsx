import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { BrandingHeader } from '@/components/client-portal'
import { DecisionCardPanel } from '@/components/client-portal'
import { getClientDecisions, getClientBranding } from '@/api/client-portal'

export function ClientPortalIndex() {
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

  const projectName = decisions[0]?.projectId ? undefined : undefined

  return (
    <div className="space-y-6 animate-in-up">
      <BrandingHeader
        branding={branding ?? null}
        projectName={projectName}
        instructions="Review the decisions below and approve your selections. You can add comments or questions before approving."
      />
      <DecisionCardPanel
        decisions={decisions}
        token={token ?? ''}
        isLoading={isLoading}
      />
    </div>
  )
}
