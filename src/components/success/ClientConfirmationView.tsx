import { Check, Shield } from 'lucide-react'
import { SuccessPageLayout } from './SuccessPageLayout'
import { SuccessCard } from './SuccessCard'
import { cn } from '@/lib/utils'
import type { DecisionOption } from '@/types'

export interface ClientConfirmationViewProps {
  projectTitle?: string
  /** Decision title - shown in selection summary when approvedOption is present */
  decisionTitle?: string
  approvedOption?: DecisionOption | null
  approvedByName?: string
  timestamp: string
  onDownloadReceipt?: () => void
  onContactSupport?: () => void
  onDone?: () => void
  onRequestChanges?: () => void
  showRequestChanges?: boolean
  optionThumbnails?: DecisionOption[]
  className?: string
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

export function ClientConfirmationView({
  projectTitle,
  decisionTitle = '',
  approvedOption,
  approvedByName,
  timestamp,
  onDownloadReceipt,
  onContactSupport,
  onDone,
  onRequestChanges,
  showRequestChanges = false,
  optionThumbnails = [],
  className,
}: ClientConfirmationViewProps) {
  const referenceData: { label: string; value: string; copyable?: boolean }[] = [
    { label: 'Approved at', value: formatTimestamp(timestamp), copyable: false },
    ...(approvedByName ? [{ label: 'Approved by', value: String(approvedByName), copyable: false }] : []),
  ]

  const primaryCTA = onDone
    ? { label: 'Done', action: onDone }
    : { label: 'Close', action: () => window.close() }

  const secondaryCTAs = [
    ...(onDownloadReceipt ? [{ label: 'Download receipt (PDF)', action: onDownloadReceipt }] : []),
    ...(onContactSupport ? [{ label: 'Contact support', action: onContactSupport }] : []),
    ...(showRequestChanges && onRequestChanges ? [{ label: 'Request changes', action: onRequestChanges }] : []),
  ]

  return (
    <SuccessPageLayout className={className}>
      <header className="col-span-full mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[rgb(0,82,204)]">Archject</span>
          {projectTitle && (
            <span className="text-sm text-[rgb(107,114,128)]">• {projectTitle}</span>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[rgb(107,114,128)]">
          <Shield className="h-4 w-4" />
          <span>Secure approval</span>
        </div>
      </header>

      <SuccessCard
        title="Approval confirmed"
        message={
          decisionTitle
            ? `Your selection for "${decisionTitle}" has been recorded. Thank you for your approval.`
            : 'Your selection has been recorded. Thank you for your approval.'
        }
        iconType="success"
        referenceData={referenceData}
        primaryCTA={primaryCTA}
        secondaryCTAs={secondaryCTAs}
      />

      {approvedOption && (
        <div className="col-span-full rounded-xl border border-[rgb(229,231,235)] bg-[#FFFFFF] p-6 shadow-card">
          <h3 className="text-base font-semibold text-[rgb(17,24,39)]">
            Your selection
          </h3>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[rgb(229,231,235)] bg-[rgb(243,244,246)] aspect-video w-full max-w-[200px]">
              {approvedOption.imageUrl ? (
                <img
                  src={approvedOption.imageUrl}
                  alt={approvedOption.label}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Check className="h-12 w-12 text-[rgb(16,185,129)]" />
              )}
            </div>
            <div>
              <p className="font-medium text-[rgb(17,24,39)]">{approvedOption.label}</p>
              {approvedOption.description && (
                <p className="mt-1 text-sm text-[rgb(107,114,128)]">
                  {approvedOption.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {optionThumbnails.length > 0 && (
        <div className="col-span-full overflow-x-auto">
          <div className="flex gap-3 pb-2">
            {optionThumbnails.map((opt) => (
              <div
                key={opt.id}
                className={cn(
                  'flex min-w-[120px] flex-col rounded-lg border-2 p-3 transition-all',
                  opt.id === approvedOption?.id
                    ? 'border-[rgb(16,185,129)] bg-[rgb(16,185,129)]/5'
                    : 'border-[rgb(229,231,235)] opacity-60'
                )}
              >
                <div className="aspect-video rounded-md bg-[rgb(243,244,246)] overflow-hidden">
                  {opt.imageUrl ? (
                    <img
                      src={opt.imageUrl}
                      alt={opt.label}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <span className="text-xs text-[rgb(107,114,128)]">—</span>
                    </div>
                  )}
                </div>
                <p className="mt-2 truncate text-xs font-medium text-[rgb(17,24,39)]">
                  {opt.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="col-span-full flex items-center gap-2 text-xs text-[rgb(107,114,128)]">
        <Shield className="h-4 w-4 shrink-0" />
        Your approval is time-stamped and recorded. No login required.
      </p>
    </SuccessPageLayout>
  )
}
