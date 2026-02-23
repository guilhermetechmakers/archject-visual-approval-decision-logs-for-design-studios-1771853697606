import { Download, FileText, FileSpreadsheet, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { Export } from '@/types/exports'

export interface ExportItemRowProps {
  exportItem: Export
  onDownload: (id: string) => void
  onViewVerification?: (id: string) => void
  isDownloading?: boolean
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  csv: FileSpreadsheet,
  pdf: FileText,
  merged_pdf: FileText,
  signed_pdf: FileText,
  zip: FileText,
}

function formatFileSize(bytes: number | null | undefined): string {
  if (bytes == null) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function ExportItemRow({
  exportItem,
  onDownload,
  onViewVerification,
  isDownloading = false,
}: ExportItemRowProps) {
  const Icon = typeIcons[exportItem.type] ?? FileText
  const canDownload = exportItem.status === 'ready' && exportItem.fileUrl

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-lg border border-[rgb(229,231,235)] bg-[#FFFFFF] p-4 transition-all duration-200',
        'hover:border-[rgb(209,213,219)] hover:shadow-sm',
        'sm:flex-row sm:items-center sm:justify-between'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgb(243,244,246)] text-[rgb(107,114,128)]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-[rgb(17,24,39)]">
              {exportItem.fileName ?? `export-${exportItem.id.slice(0, 8)}.${exportItem.type === 'csv' ? 'csv' : 'pdf'}`}
            </span>
            {exportItem.signed && (
              <Badge
                className="bg-[rgb(16,185,129)]/10 text-[rgb(16,185,129)] hover:bg-[rgb(16,185,129)]/20"
                title={
                  exportItem.signatureHash
                    ? `Signature type: internal PKI. Hash: ${exportItem.signatureHash.slice(0, 16)}...`
                    : 'Digitally signed document'
                }
              >
                Legally signed
              </Badge>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-sm text-[rgb(107,114,128)]">
            <span>{formatFileSize(exportItem.fileSize)}</span>
            <span>•</span>
            <span>
              {exportItem.createdAt
                ? new Date(exportItem.createdAt).toLocaleString()
                : '—'}
            </span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {canDownload && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDownload(exportItem.id)}
            disabled={isDownloading}
            className="min-h-[44px] min-w-[44px"
          >
            <Download className="h-4 w-4" />
            <span className="ml-1.5 sm:inline">Download</span>
          </Button>
        )}
        {exportItem.signed && onViewVerification && exportItem.signatureHash && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewVerification(exportItem.id)}
            className="min-h-[44px] min-w-[44px"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="ml-1.5 sm:inline">Verify</span>
          </Button>
        )}
      </div>
    </div>
  )
}
