import { Paperclip, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PortalAttachment } from '@/types/portal'

export interface AttachmentsViewProps {
  attachments: PortalAttachment[]
  className?: string
}

function formatSize(bytes?: number): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AttachmentsView({ attachments, className }: AttachmentsViewProps) {
  if (attachments.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border border-dashed border-[rgb(229,231,235)] py-8 text-center',
          className
        )}
      >
        <Paperclip className="h-10 w-10 text-[rgb(107,114,128)]" />
        <p className="mt-2 text-sm text-[rgb(107,114,128)]">No attachments</p>
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2">
        <Paperclip className="h-4 w-4 text-[rgb(107,114,128)]" />
        <h4 className="text-sm font-medium text-[rgb(17,24,39)]">Attachments</h4>
      </div>
      <ul className="space-y-1">
        {attachments.map((att) => (
          <li key={att.id}>
            <a
              href={att.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-[rgb(229,231,235)] bg-[#FFFFFF] px-3 py-2 text-sm text-[rgb(17,24,39)] transition-colors hover:bg-[rgb(243,244,246)]"
            >
              <span className="min-w-0 truncate">{att.filename}</span>
              {att.size != null && (
                <span className="shrink-0 text-xs text-[rgb(107,114,128)]">
                  {formatSize(att.size)}
                </span>
              )}
              <ExternalLink className="h-4 w-4 shrink-0 text-[rgb(107,114,128)]" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
