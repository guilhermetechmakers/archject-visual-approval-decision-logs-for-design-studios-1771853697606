import { Download, FileText, FileSpreadsheet, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface ExportItemRowProps {
  type: 'csv' | 'pdf' | 'signed_pdf'
  fileName: string
  fileSize?: number
  signed?: boolean
  signatureHash?: string | null
  onDownload?: () => void
  onView?: () => void
  isDownloading?: boolean
  className?: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileIcon(type: ExportItemRowProps['type']) {
  switch (type) {
    case 'csv':
      return <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
    case 'pdf':
    case 'signed_pdf':
      return <FileText className="h-5 w-5 text-muted-foreground" />
    default:
      return <FileText className="h-5 w-5 text-muted-foreground" />
  }
}

/**
 * Export item row: file type icon, filename, size, action icons (download, view).
 */
export function ExportItemRow({
  type,
  fileName,
  fileSize,
  signed,
  signatureHash,
  onDownload,
  onView,
  isDownloading,
  className,
}: ExportItemRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border border-[#E5E7EB] bg-white',
        'hover:border-[#D1D5DB] transition-colors',
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">{getFileIcon(type)}</div>
        <div className="min-w-0">
          <p className="font-medium text-[#111827] truncate">{fileName}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {fileSize != null && (
              <span className="text-xs text-[#6B7280]">{formatFileSize(fileSize)}</span>
            )}
            {signed && (
              <Badge
                variant="success"
                className="text-[10px]"
                title={signatureHash ? `Signature hash: ${signatureHash}` : 'Digitally signed document'}
              >
                Legally signed
              </Badge>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {onDownload && (
          <Button
            size="sm"
            variant="outline"
            onClick={onDownload}
            disabled={isDownloading}
            className="min-h-[44px] sm:min-h-0"
          >
            <Download className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">{isDownloading ? 'Downloading…' : 'Download'}</span>
          </Button>
        )}
        {onView && (
          <Button size="sm" variant="ghost" onClick={onView} className="min-h-[44px] sm:min-h-0">
            <ExternalLink className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
