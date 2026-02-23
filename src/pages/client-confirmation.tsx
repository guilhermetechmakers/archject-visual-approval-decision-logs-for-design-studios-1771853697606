import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ClientConfirmationView } from '@/components/success'
import { validateClientToken } from '@/api/client-token'
import { api } from '@/lib/api'
import type { Decision } from '@/types'

interface ClientConfirmationData {
  decision: Decision
  referenceId: string
  timestamp: string
  approvedOptionLabel?: string
  approvedByName?: string
}

export function ClientConfirmationPage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const stateApprovedOption = (location.state as { approvedOption?: { id: string; label: string; description?: string; imageUrl?: string } })?.approvedOption

  const { data: tokenData } = useQuery({
    queryKey: ['client-token-validate', token],
    queryFn: () => validateClientToken(token!),
    enabled: !!token,
  })

  const { data: confirmationData, isLoading } = useQuery({
    queryKey: ['client-confirmation', token],
    queryFn: async (): Promise<ClientConfirmationData | null> => {
      if (!token || !tokenData?.valid) return null
      const conf = await api
        .get<{
          decisionId: string
          projectTitle: string
          decisionTitle: string
          approvedByName: string | null
          timestamp: string
          options: unknown[]
        }>(`/v1/client/confirmation?token=${encodeURIComponent(token)}`)
        .catch(() => null)
      if (!conf) return null
      const decision = await api.get<Decision>(`/v1/client/${token}`).catch(() => null)
      const approvedOpt = decision?.options?.find((o) => o.selected)
      return {
        decision: decision ?? {
          id: conf.decisionId,
          projectId: tokenData.projectId,
          title: conf.decisionTitle,
          options: conf.options as Decision['options'],
          status: 'approved',
          createdAt: conf.timestamp,
          updatedAt: conf.timestamp,
        },
        referenceId: `conf-${Date.now()}`,
        timestamp: conf.timestamp,
        approvedOptionLabel: approvedOpt?.label,
        approvedByName: conf.approvedByName ?? undefined,
      }
    },
    enabled: !!token && !!tokenData?.valid,
  })

  const handleDone = () => {
    if (token) {
      navigate(`/client/${token}`)
    }
  }

  const handleContactSupport = () => {
    window.location.href = '/help'
  }

  const handleDownloadReceipt = async () => {
    // Placeholder: in real flow, would call export API with client token
    window.open(`/api/v1/exports?token=${token}`, '_blank')
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F7F7F9] flex items-center justify-center p-4">
        <p className="text-[#6B7280]">Invalid link</p>
      </div>
    )
  }

  if (!tokenData?.valid && !isLoading) {
    return (
      <div className="min-h-screen bg-[#F7F7F9] flex items-center justify-center p-4">
        <p className="text-[#6B7280]">This link has expired or is invalid.</p>
      </div>
    )
  }

  if (isLoading || !confirmationData) {
    return (
      <div className="min-h-screen bg-[#F7F7F9] flex items-center justify-center p-4">
        <div className="animate-spin h-8 w-8 border-2 border-[#0052CC] border-t-transparent rounded-full" />
      </div>
    )
  }

  const { decision, timestamp } = confirmationData
  const approvedOption =
    stateApprovedOption ??
    decision.options?.find((o) => o.selected) ??
    (confirmationData.approvedOptionLabel
      ? { id: '', label: confirmationData.approvedOptionLabel, description: undefined, imageUrl: undefined }
      : null)

  return (
    <ClientConfirmationView
      projectTitle="Archject"
      decisionTitle={decision.title}
      approvedOption={approvedOption}
      approvedByName={confirmationData.approvedByName}
      timestamp={timestamp}
      onDone={handleDone}
      onContactSupport={handleContactSupport}
      onDownloadReceipt={handleDownloadReceipt}
      optionThumbnails={
        decision.options?.map((o) => ({
          id: o.id,
          label: o.label,
          description: o.description,
          imageUrl: o.imageUrl,
        })) ?? []
      }
    />
  )
}
