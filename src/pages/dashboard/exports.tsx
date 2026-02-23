import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  ExportGeneratorPanel,
  ExportSettingsPanel,
  ExportHistoryList,
  BillingInfoPanel,
} from '@/components/exports'
import { LoadingOverlay } from '@/components/loading-overlay/loading-overlay'
import { createExport } from '@/api/exports-decision-logs'
import type { ExportGeneratorState } from '@/components/exports'
import type { ExportSettingsState } from '@/components/exports'

const initialGeneratorState: ExportGeneratorState = {
  projectId: '',
  decisionIds: [],
  format: 'PDF',
  includeAttachments: false,
}

const initialSettingsState: ExportSettingsState = {
  brandingProfileId: '',
  signatureRequested: false,
  timestampGranularity: 'second',
}

export function ExportsPage() {
  const queryClient = useQueryClient()
  const [generatorState, setGeneratorState] = useState(initialGeneratorState)
  const [settingsState, setSettingsState] = useState(initialSettingsState)
  const [exportJobId, setExportJobId] = useState<string | null>(null)
  const [overlayOpen, setOverlayOpen] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!generatorState.projectId || generatorState.decisionIds.length === 0) {
      toast.error('Select a project and at least one decision')
      return
    }

    try {
      const { jobId } = await createExport({
        projectId: generatorState.projectId,
        decisionIds: generatorState.decisionIds,
        format: generatorState.format,
        includeAttachments: generatorState.includeAttachments,
        brandingProfileId: settingsState.brandingProfileId || undefined,
        signatureRequested: settingsState.signatureRequested,
      })
      setExportJobId(jobId)
      setOverlayOpen(true)
      queryClient.invalidateQueries({ queryKey: ['export-history'] })
      toast.success('Export started')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start export')
    }
  }, [generatorState, settingsState, queryClient])

  const handleOverlayClose = useCallback(() => {
    setOverlayOpen(false)
    setExportJobId(null)
    queryClient.invalidateQueries({ queryKey: ['export-history'] })
  }, [queryClient])

  const handleRetry = useCallback(() => {
    setExportJobId(null)
    setOverlayOpen(false)
    handleSubmit()
  }, [handleSubmit])

  return (
    <div className="space-y-8 animate-in">
      {/* Breadcrumb header */}
      <div>
        <nav className="flex items-center gap-2 text-sm text-muted-foreground" aria-label="Breadcrumb">
          <Link to="/dashboard" className="hover:text-foreground transition-colors">
            Dashboard
          </Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground font-medium">Exports & Decision Logs</span>
        </nav>
        <h1 className="mt-2 text-[28px] font-semibold">Exports & Decision Logs</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Generate downloadable approval packs with full history, attachments, and firm branding.
        </p>
      </div>

      {/* Main grid: generator + settings | history + billing */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <ExportGeneratorPanel
            state={generatorState}
            onStateChange={setGeneratorState}
            onSubmit={handleSubmit}
            isSubmitting={!!exportJobId && overlayOpen}
          />
          <ExportSettingsPanel
            state={settingsState}
            onStateChange={setSettingsState}
          />
        </div>
        <div className="space-y-6 lg:col-span-4">
          <BillingInfoPanel />
          <ExportHistoryList limit={10} />
        </div>
      </div>

      <LoadingOverlay
        jobId={exportJobId}
        operationName="Generating Decision Log"
        subtitle={
          generatorState.format === 'PDF'
            ? 'Compiling PDF with audit trail and branding'
            : 'Compiling CSV export'
        }
        open={overlayOpen}
        onOpenChange={(open) => !open && handleOverlayClose()}
        onRetry={handleRetry}
        exportsPagePath="/dashboard/exports"
      />
    </div>
  )
}
