import { useEffect, useRef, useState } from 'react'
import { FileText, Image, X, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { LibraryFile } from '@/types'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'
const PREVIEWABLE_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

export interface FilePreviewPanelProps {
  file: LibraryFile | null
  projectId: string
  onClose: () => void
  onDownload?: () => void
  className?: string
}

export function FilePreviewPanel({
  file,
  projectId,
  onClose,
  onDownload,
  className,
}: FilePreviewPanelProps) {
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    if (!file || !projectId) return
    const isImage = PREVIEWABLE_IMAGE_TYPES.some((t) => file.filetype?.toLowerCase().includes(t.split('/')[1]))
    const isPdf = file.filetype?.toLowerCase().includes('pdf')
    if (!isImage && !isPdf) return

    const staticUrl = file.thumbnailUrl ?? file.previewUrl
    const hasStaticUrl = staticUrl && (staticUrl.startsWith('http') || staticUrl.startsWith('/'))
    if (isImage && hasStaticUrl) return

    const token = localStorage.getItem('auth_token')
    const previewUrl = `${API_BASE}/projects/${projectId}/files/${file.id}/preview`
    fetch(previewUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob)
          objectUrlRef.current = url
          setPreviewObjectUrl(url)
        }
      })
      .catch(() => {})

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
      setPreviewObjectUrl(null)
    }
  }, [file?.id, projectId, file?.filetype, file?.thumbnailUrl, file?.previewUrl])

  if (!file) return null

  const isImage = PREVIEWABLE_IMAGE_TYPES.some((t) => file.filetype?.toLowerCase().includes(t.split('/')[1]))
  const isPdf = file.filetype?.toLowerCase().includes('pdf')
  const canPreview = isImage || isPdf

  const staticUrl = file.thumbnailUrl ?? file.previewUrl
  const srcUrl = previewObjectUrl ?? (staticUrl && (staticUrl.startsWith('http') || staticUrl.startsWith('/')) ? staticUrl : null)
  const isLoading = canPreview && !srcUrl

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card',
        className
      )}
      role="region"
      aria-label="File preview"
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <p className="truncate text-sm font-medium" title={file.filename}>
          {file.filename}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {onDownload && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onDownload}
              aria-label="Download file"
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="relative flex min-h-[200px] flex-1 items-center justify-center bg-muted/30 p-4">
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm">Loading preview...</p>
          </div>
        ) : isImage && srcUrl ? (
          <img
            src={srcUrl}
            alt={file.filename}
            className="max-h-[400px] max-w-full object-contain"
          />
        ) : isPdf && srcUrl ? (
          <iframe
            src={srcUrl}
            title={file.filename}
            className="h-[400px] w-full rounded-lg border border-border"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            {file.filetype?.startsWith('image/') ? (
              <Image className="h-16 w-16" />
            ) : (
              <FileText className="h-16 w-16" />
            )}
            <p className="text-sm">Preview not available</p>
            <p className="text-xs">Download to view this file</p>
          </div>
        )}
      </div>
    </div>
  )
}
