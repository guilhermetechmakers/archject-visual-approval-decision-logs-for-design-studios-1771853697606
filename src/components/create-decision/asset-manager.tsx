import { useCallback, useRef } from 'react'
import { Upload, X, Image } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FilePreview {
  id: string
  name: string
  size?: number
  previewUrl?: string
  mimeType?: string
}

export interface AssetManagerProps {
  files: FilePreview[]
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  maxFiles?: number
  maxSizeBytes?: number
  acceptedTypes?: string
  disabled?: boolean
  className?: string
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024 // 10MB
const DEFAULT_ACCEPTED = 'image/*,.pdf,.png,.jpg,.jpeg,.webp'

export function AssetManager({
  files,
  onAdd,
  onRemove,
  maxFiles = 10,
  maxSizeBytes = DEFAULT_MAX_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED,
  disabled = false,
  className,
}: AssetManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files
      if (!selected?.length) return
      const valid: File[] = []
      for (let i = 0; i < selected.length; i++) {
        const f = selected[i]
        if (f.size <= maxSizeBytes && files.length + valid.length < maxFiles) {
          valid.push(f)
        }
      }
      if (valid.length > 0) {
        onAdd(valid)
      }
      e.target.value = ''
    },
    [files.length, maxFiles, maxSizeBytes, onAdd]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      if (disabled) return
      const dropped = Array.from(e.dataTransfer.files).filter(
        (f) => f.size <= maxSizeBytes && files.length < maxFiles
      )
      if (dropped.length > 0) onAdd(dropped)
    },
    [disabled, files.length, maxFiles, maxSizeBytes, onAdd]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  return (
    <div className={cn('space-y-3', className)}>
      <div
        className={cn(
          'flex min-h-[120px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-muted/30 p-4 transition-colors',
          !disabled && 'hover:border-primary/50 hover:bg-muted/50 cursor-pointer'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={acceptedTypes}
          onChange={handleFileChange}
          className="sr-only"
          disabled={disabled}
        />
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="mt-2 text-sm text-muted-foreground">
          Drag files here or click to upload
        </p>
        <p className="text-xs text-muted-foreground">
          Images, PDFs up to {Math.round(maxSizeBytes / 1024 / 1024)}MB
        </p>
      </div>

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {files.map((f) => (
            <div
              key={f.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              {f.previewUrl || f.mimeType?.startsWith('image/') ? (
                <img
                  src={f.previewUrl ?? '#'}
                  alt={f.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Image className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute right-1 top-1 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemove(f.id)
                }}
                disabled={disabled}
                aria-label={`Remove ${f.name}`}
              >
                <X className="h-3 w-3" />
              </Button>
              <p className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-2 py-1 text-xs text-white">
                {f.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
