import { FileText } from 'lucide-react'
import { ExportItemRow } from './ExportItemRow'
import { ExportProgress } from './ExportProgress'
import { CTAButton } from './CTAButton'
import { cn } from '@/lib/utils'
import type { Export } from '@/types/exports'

export interface ExportReadyViewProps {
  exports: Export[]
  jobProgress?: number | null | undefined
  isJobInProgress?: boolean
  onDownload: (exportId: string) => void
  onViewExportHistory: () => void
  onViewVerification?: (exportId: string) => void
  isDownloading?: boolean
  exportHistoryPath?: string
  className?: string
}

export function ExportReadyView({
  exports,
  jobProgress,
  isJobInProgress = false,
  onDownload,
  onViewExportHistory,
  onViewVerification,
  isDownloading = false,
  className,
}: ExportReadyViewProps) {
  const readyExports = exports.filter((e) => e.status === 'ready')

  return (
    <div className={cn('space-y-4', className)}>
      {isJobInProgress ? (
        <ExportProgress
          percent={jobProgress ?? 0}
          message="Generating your export…"
          isIndeterminate={jobProgress === 0}
        />
      ) : null}

      {readyExports.length > 0 && (
        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[rgb(17,24,39)]">
            <FileText className="h-5 w-5 text-[rgb(107,114,128)]" />
            Export files
          </h3>
          <div className="space-y-2">
            {readyExports.map((exp) => (
              <ExportItemRow
                key={exp.id}
                exportItem={exp}
                onDownload={onDownload}
                onViewVerification={onViewVerification}
                isDownloading={isDownloading}
              />
            ))}
          </div>
        </div>
      )}

      <CTAButton
        label="View export history"
        onClick={onViewExportHistory}
        variant="secondary"
      />
    </div>
  )
}
