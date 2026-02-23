import {
  FileText,
  Image,
  FileSpreadsheet,
  File,
  MoreVertical,
  Download,
  History,
  Link2,
  Archive,
  Trash2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import type { LibraryFile } from '@/types'

const PREVIEWABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

function getFileIcon(filetype: string) {
  if (filetype.includes('pdf')) return FileText
  if (filetype.includes('image')) return Image
  if (filetype.includes('sheet') || filetype.includes('excel')) return FileSpreadsheet
  return File
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  })
}

export interface ThumbnailCardProps {
  file: LibraryFile
  onVersionHistory?: (file: LibraryFile) => void
  onAttachToDecision?: (file: LibraryFile) => void
  onDownload?: (file: LibraryFile) => void
  onArchive?: (file: LibraryFile) => void
  onDelete?: (file: LibraryFile) => void
  onPreview?: (file: LibraryFile) => void
  className?: string
}

export function ThumbnailCard({
  file,
  onVersionHistory,
  onAttachToDecision,
  onDownload,
  onArchive,
  onDelete,
  onPreview,
  className,
}: ThumbnailCardProps) {
  const hasPreview = PREVIEWABLE_TYPES.some((t) => file.filetype.includes(t.split('/')[1]))
  const thumbUrl = file.thumbnailUrl
  const FileIcon = getFileIcon(file.filetype)

  return (
    <div
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5',
        file.isArchived && 'opacity-60',
        className
      )}
    >
      {/* Thumbnail area - clickable for preview */}
      <div
        role={onPreview ? 'button' : undefined}
        tabIndex={onPreview ? 0 : undefined}
        onClick={onPreview ? () => onPreview(file) : undefined}
        onKeyDown={onPreview ? (e) => e.key === 'Enter' && onPreview(file) : undefined}
        className={cn(
          'relative aspect-[4/3] bg-muted',
          onPreview && 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset'
        )}
        aria-label={onPreview ? `Preview ${file.filename}` : undefined}
      >
        {thumbUrl && hasPreview ? (
          <img
            src={thumbUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <FileIcon className="h-16 w-16 text-muted-foreground" />
          </div>
        )}
        {file.isArchived && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Badge variant="secondary">Archived</Badge>
          </div>
        )}
        <div className="absolute right-2 top-2 flex flex-col items-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Badge variant="secondary" className="text-xs">
            v{file.currentVersion}
          </Badge>
          {file.scanStatus && file.scanStatus !== 'CLEAN' && (
            <Badge
              variant={file.scanStatus === 'INFECTED' ? 'destructive' : file.scanStatus === 'PENDING' ? 'warning' : 'secondary'}
              className="text-xs"
            >
              {file.scanStatus === 'INFECTED' ? 'Quarantined' : file.scanStatus === 'PENDING' ? 'Scanning' : file.scanStatus}
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="truncate font-medium text-foreground" title={file.filename}>
          {file.filename}
        </p>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{formatSize(file.size)}</span>
          <span>{formatDate(file.uploadedAt)}</span>
        </div>

        <div className="mt-auto flex items-center justify-between pt-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" aria-label="Actions" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onDownload && (
                <DropdownMenuItem onClick={() => onDownload(file)}>
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </DropdownMenuItem>
              )}
              {onVersionHistory && (
                <DropdownMenuItem onClick={() => onVersionHistory(file)}>
                  <History className="mr-2 h-4 w-4" />
                  Version history
                </DropdownMenuItem>
              )}
              {onAttachToDecision && (
                <DropdownMenuItem onClick={() => onAttachToDecision(file)}>
                  <Link2 className="mr-2 h-4 w-4" />
                  Attach to decision
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {onArchive && !file.isArchived && (
                <DropdownMenuItem onClick={() => onArchive(file)}>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(file)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  )
}
