/**
 * File Preview Panel: inline preview for images and PDFs.
 * Used in Library page, Decision Detail, and Attachment Picker.
 */
import { useState, useEffect } from 'react'
import { FileText, Download, X, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getFilePreviewBlobUrl } from '@/api/library'

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

export interface FilePreviewPanelProps {
  filename: string
  filetype: string
  previewUrl?: string | null
  downloadUrl?: string
  /** For PDF preview: fetch blob URL when fileId/projectId provided */
  fileId?: string
  projectId?: string
  onDownload?: () => void
  onClose?: () => void
  className?: string
}

export function FilePreviewPanel({
  filename,
  filetype,
  previewUrl,
  downloadUrl,
  fileId,
  projectId,
  onDownload,
  onClose,
  className,
}: FilePreviewPanelProps) {
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null)
  const [pdfError, setPdfError] = useState(false)
  const isImage = IMAGE_TYPES.some((t) => filetype.toLowerCase().includes(t.split('/')[1]))
  const isPdf = filetype.toLowerCase().includes('pdf')

  useEffect(() => {
    if (isPdf && fileId && projectId && !previewUrl) {
      let blobUrl: string | null = null
      getFilePreviewBlobUrl(projectId, fileId)
        .then((url) => {
          blobUrl = url
          setPdfBlobUrl(url)
        })
        .catch(() => setPdfError(true))
      return () => {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
      }
    }
  }, [isPdf, fileId, projectId, previewUrl])

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card',
        className
      )}
      role="region"
      aria-label={`Preview of ${filename}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="truncate text-sm font-medium text-foreground" title={filename}>
          {filename}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {onDownload && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDownload}
              aria-label="Download file"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Preview content */}
      <div className="relative flex-1 min-h-[200px] bg-muted/50 flex items-center justify-center overflow-auto">
        {isImage && previewUrl ? (
          <img
            src={previewUrl}
            alt={filename}
            className="max-h-[400px] w-auto object-contain"
          />
        ) : isPdf && (previewUrl || pdfBlobUrl) && !pdfError ? (
          <iframe
            src={previewUrl ?? pdfBlobUrl ?? undefined}
            title={`PDF preview: ${filename}`}
            className="w-full h-[400px] min-h-[300px] border-0"
            onError={() => setPdfError(true)}
          />
        ) : isPdf ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 font-medium">PDF preview</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {downloadUrl ? (
                <>
                  <a
                    href={downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    Open in new tab
                    <ExternalLink className="h-3 w-3" />
                  </a>
                  {' or download to view'}
                </>
              ) : (
                'Download to view'
              )}
            </p>
            {onDownload && (
              <Button variant="outline" size="sm" className="mt-4" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FileText className="h-16 w-16 text-muted-foreground" />
            <p className="mt-4 font-medium">No preview available</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Download the file to view its contents
            </p>
            {onDownload && (
              <Button variant="outline" size="sm" className="mt-4" onClick={onDownload}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
