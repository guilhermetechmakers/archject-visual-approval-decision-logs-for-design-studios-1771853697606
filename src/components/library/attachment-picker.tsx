/**
 * Attachment Picker: select files from the library to attach to a decision.
 * Used in Create Decision flow and Decision Detail page.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link2, FileText, Image, File, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getLibraryFiles } from '@/api/library'
import type { LibraryFile } from '@/types'

const PREVIEWABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']

function getFileIcon(filetype: string) {
  if (filetype.includes('pdf')) return FileText
  if (filetype.includes('image')) return Image
  return File
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export interface AttachmentPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  onSelect: (file: LibraryFile) => void
  excludeFileIds?: string[]
  /** When creating a decision, decisionId may not exist yet */
  mode?: 'attach' | 'select'
}

export function AttachmentPicker({
  open,
  onOpenChange,
  projectId,
  onSelect,
  excludeFileIds = [],
  mode = 'attach',
}: AttachmentPickerProps) {
  const [search, setSearch] = useState('')

  const { data: files = [], isLoading } = useQuery({
    queryKey: ['library-files', projectId, search],
    queryFn: () =>
      getLibraryFiles(projectId, {
        search: search || undefined,
        includeArchived: false,
      }),
    enabled: open && !!projectId,
  })

  const filteredFiles = files.filter((f) => !excludeFileIds.includes(f.id))

  const handleSelect = (file: LibraryFile) => {
    onSelect(file)
    onOpenChange(false)
  }

  return (
    <Dialog open={open}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-h-[85vh] max-w-2xl overflow-hidden flex flex-col"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            {mode === 'attach' ? 'Attach from library' : 'Select from library'}
          </DialogTitle>
          <DialogDescription>
            Choose a file from the Drawings & Specs library to attach to this decision
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search files by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
              aria-label="Search library files"
            />
          </div>

          {isLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 overflow-y-auto flex-1 min-h-[200px]">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <p className="mt-4 font-medium">No files found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {files.length === 0
                  ? 'Upload files to the library first, then attach them here.'
                  : 'No matching files. Try a different search.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 overflow-y-auto flex-1 min-h-[200px] pr-2">
              {filteredFiles.map((file) => {
                const hasPreview = PREVIEWABLE_TYPES.some((t) =>
                  file.filetype.toLowerCase().includes(t.split('/')[1])
                )
                const FileIcon = getFileIcon(file.filetype)
                const thumbUrl = file.thumbnailUrl

                return (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => handleSelect(file)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3 text-left transition-all duration-200',
                      'hover:border-primary/50 hover:shadow-sm hover:bg-primary/5',
                      'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
                      'border-border'
                    )}
                    aria-label={`Select ${file.filename}`}
                  >
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center">
                      {thumbUrl && hasPreview ? (
                        <img
                          src={thumbUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <FileIcon className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground" title={file.filename}>
                        {file.filename}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
