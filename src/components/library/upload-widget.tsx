import { useCallback, useState, useRef } from 'react'
import { Upload, X, FileUp, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

const ALLOWED_EXTENSIONS = [
  '.pdf', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg',
  '.dwg', '.dxf', '.doc', '.docx', '.xls', '.xlsx',
]
const MAX_SIZE_MB = 50

export interface UploadWidgetProps {
  /** (files, reportProgress) => Promise. reportProgress(0-100) can be called during upload */
  onUpload: (files: File[], reportProgress?: (percent: number) => void) => Promise<void>
  disabled?: boolean
  className?: string
}

export function UploadWidget({ onUpload, disabled, className }: UploadWidgetProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `"${file.name}" has unsupported format. Allowed: PDF, images, DWG, DOC, XLS`
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return `"${file.name}" exceeds ${MAX_SIZE_MB}MB limit`
    }
    return null
  }

  const handleFiles = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length || disabled || uploading) return
      setError(null)
      const files = Array.from(fileList)
      for (const f of files) {
        const err = validateFile(f)
        if (err) {
          setError(err)
          return
        }
      }
      setUploading(true)
      setProgress(0)
      try {
        await onUpload(files, (p) => setProgress(p))
        setProgress(100)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Upload failed')
      } finally {
        setUploading(false)
        setProgress(0)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [onUpload, disabled, uploading]
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled && !uploading) setIsDragging(true)
  }

  const handleDragLeave = () => setIsDragging(false)

  const handleClick = () => {
    if (disabled || uploading) return
    inputRef.current?.click()
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all duration-200',
          isDragging && 'border-primary bg-primary/5',
          !isDragging && 'border-border hover:border-muted-foreground/50 hover:bg-muted/30',
          (disabled || uploading) && 'pointer-events-none opacity-60'
        )}
        aria-label="Upload files"
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ALLOWED_EXTENSIONS.join(',')}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <>
            <FileUp className="h-12 w-12 text-primary animate-pulse" />
            <p className="mt-4 font-medium">Uploading...</p>
            <Progress value={progress} className="mt-2 w-48" />
          </>
        ) : (
          <>
            <Upload className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium text-foreground">
              Drag and drop files here, or click to browse
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              PDF, images, DWG, DOC, XLS up to {MAX_SIZE_MB}MB
            </p>
          </>
        )}
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-6 w-6"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
