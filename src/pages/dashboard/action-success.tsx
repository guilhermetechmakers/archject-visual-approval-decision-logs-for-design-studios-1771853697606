import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { SuccessPageLayout } from '@/components/success'
import { SuccessCard } from '@/components/success'
import { ExportReadyView } from '@/components/success'
import { ExportProgress } from '@/components/success'
import { ActivityAuditLink } from '@/components/success'
import { getExport, listExports } from '@/api/exports'
import { useJobStatus } from '@/hooks/use-job-status'

interface SuccessState {
  referenceId: string
  timestamp: string
  projectId: string
  actor?: string
  decisionIds?: string[]
  exportJobId?: string
}

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function ActionSuccessPage() {
  const { projectId, actionId } = useParams<{ projectId: string; actionId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state as SuccessState | null) ?? {
    referenceId: actionId ?? crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    projectId: projectId ?? '',
    actor: 'You',
    exportJobId: undefined as string | undefined,
  }

  const exportJobId = state?.exportJobId
  const { state: jobState, percent, job } = useJobStatus(exportJobId ?? null)

  const { data: exportsData } = useQuery({
    queryKey: ['exports', projectId],
    queryFn: () => listExports(projectId!, 10),
    enabled: !!projectId && (jobState === 'COMPLETED' || !exportJobId),
  })

  const exports = exportsData?.exports ?? []
  const isJobInProgress = jobState === 'QUEUED' || jobState === 'IN_PROGRESS'

  const handleCopy = (value: string) => {
    navigator.clipboard.writeText(value)
    toast.success('Copied to clipboard')
  }

  const handleDownload = async (exportId: string) => {
    try {
      const exp = await getExport(exportId)
      if (exp.fileUrl) {
        const token = localStorage.getItem('auth_token')
        const res = await fetch(exp.fileUrl, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (!res.ok) throw new Error('Download failed')
        const blob = await res.blob()
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = exp.fileName ?? `export-${exportId}.pdf`
        a.click()
        URL.revokeObjectURL(a.href)
        toast.success('Download started')
      }
    } catch {
      toast.error('Download failed')
    }
  }

  const referenceData = state
    ? [
        { label: 'Reference ID', value: state.referenceId, copyable: true },
        { label: 'Timestamp', value: formatTimestamp(state.timestamp), copyable: false },
        ...(state.actor ? [{ label: 'Actor', value: state.actor, copyable: false }] : []),
      ]
    : []

  return (
    <SuccessPageLayout>
      <SuccessCard
        title="Action confirmed"
        message="Your action has been recorded successfully. You can return to the project or download exports below."
        iconType="success"
        referenceData={referenceData}
        primaryCTA={{
          label: 'Back to project',
          action: () => navigate(projectId ? `/dashboard/projects/${projectId}` : '/dashboard'),
        }}
        secondaryCTAs={[
          {
            label: 'View export history',
            action: () => navigate('/dashboard/exports'),
          },
        ]}
        onCopyReference={handleCopy}
      />

      {exportJobId && isJobInProgress && (
        <div className="col-span-full">
          <ExportProgress
            percent={percent ?? 0}
            message={job?.currentStep ?? 'Preparing export…'}
            isIndeterminate={percent == null}
          />
        </div>
      )}

      {exports.length > 0 && (
        <div className="col-span-full space-y-4">
          <ExportReadyView
            exports={exports}
            jobProgress={isJobInProgress ? (percent ?? 0) : 100}
            isJobInProgress={isJobInProgress}
            onDownload={handleDownload}
            onViewExportHistory={() => navigate('/dashboard/exports')}
            onViewVerification={(id) => navigate(`/dashboard/exports?verify=${id}`)}
          />
        </div>
      )}

      <div className="col-span-full">
        <ActivityAuditLink
          onClick={() => navigate(projectId ? `/dashboard/projects/${projectId}` : '/dashboard')}
        />
      </div>
    </SuccessPageLayout>
  )
}
