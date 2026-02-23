import { useState, useRef, useCallback } from 'react'
import { Upload, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { uploadAvatar } from '@/api/users'
import { cn } from '@/lib/utils'

const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

interface AvatarUploaderProps {
  open: boolean
  onClose: () => void
  onSuccess: (avatarUrl: string) => void
}

export function AvatarUploader({ open, onClose, onSuccess }: AvatarUploaderProps) {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<string | null>(null)

  const reset = useCallback(() => {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current)
      previewRef.current = null
    }
    setFile(null)
    setPreview(null)
    setError(null)
    setUploading(false)
    setProgress(0)
  }, [])

  const handleClose = () => {
    reset()
    onClose()
  }

  const validateFile = (f: File): string | null => {
    if (!ALLOWED_TYPES.includes(f.type)) {
      return 'File must be JPEG, PNG, or WebP'
    }
    if (f.size > MAX_SIZE) {
      return 'File must be under 5MB'
    }
    return null
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (!f) return
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setFile(f)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = URL.createObjectURL(f)
    previewRef.current = url
    setPreview(url)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const err = validateFile(f)
    if (err) {
      setError(err)
      return
    }
    setError(null)
    setFile(f)
    if (previewRef.current) URL.revokeObjectURL(previewRef.current)
    const url = URL.createObjectURL(f)
    previewRef.current = url
    setPreview(url)
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    setError(null)
    setProgress(30)
    try {
      const result = await uploadAvatar(file)
      setProgress(100)
      onSuccess(result.avatar_url)
      handleClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }

  const handleCancel = () => {
    if (!uploading) handleClose()
  }

  return (
    <Dialog open={open}>
      <DialogContent onClose={handleCancel} className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload profile picture</DialogTitle>
          <DialogDescription>
            Choose an image (JPEG, PNG, or WebP, max 5MB). Recommended size: 256×256 for best quality.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => inputRef.current?.click()}
            className={cn(
              'flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/30 p-6 transition-colors hover:bg-muted/50',
              error && 'border-destructive'
            )}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            {preview ? (
              <div className="relative">
                <img
                  src={preview}
                  alt="Preview"
                  className="h-32 w-32 rounded-full object-cover ring-2 ring-border"
                />
                <p className="mt-2 text-sm text-muted-foreground">{file?.name}</p>
              </div>
            ) : (
              <>
                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">Drop or click to select</p>
                <p className="text-xs text-muted-foreground">JPEG, PNG, WebP · Max 5MB</p>
              </>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          {uploading && (
            <div className="space-y-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={uploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
