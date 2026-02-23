/**
 * Attachments step: drag-and-drop images/drawings with previews, or attach from library.
 */
import { useCallback, useState } from 'react'
import { Link2 } from 'lucide-react'
import { AssetManager } from '@/components/create-decision/asset-manager'
import { AttachmentPicker } from '@/components/library'
import { Button } from '@/components/ui/button'
import { validateFile, MAX_ATTACHMENTS_COUNT, MAX_ATTACHMENT_SIZE_BYTES } from '@/lib/validation'
import type { AttachmentDraft } from '@/api/decisions-create'
import type { LibraryFile } from '@/types'

export interface AttachmentsStepProps {
  attachments: AttachmentDraft[]
  onAttachmentsChange: (attachments: AttachmentDraft[]) => void
  onContinue: () => void
  errors?: string[]
  projectId: string
}

function toFilePreview(a: AttachmentDraft): { id: string; name: string; size?: number; previewUrl?: string; mimeType?: string } {
  return {
    id: a.id,
    name: a.name,
    size: a.size,
    previewUrl: a.previewUrl,
    mimeType: a.mimeType,
  }
}

export function AttachmentsStep({
  attachments,
  onAttachmentsChange,
  onContinue,
  errors = [],
  projectId,
}: AttachmentsStepProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  const handleAddFromLibrary = useCallback(
    (file: LibraryFile) => {
      if (attachments.length >= MAX_ATTACHMENTS_COUNT) return
      const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
      const thumbUrl = file.thumbnailUrl
        ? (base ? `${base}${file.thumbnailUrl}` : file.thumbnailUrl)
        : undefined
      const draft: AttachmentDraft = {
        id: crypto.randomUUID(),
        name: file.filename,
        size: file.size,
        previewUrl: thumbUrl,
        mimeType: file.filetype,
        libraryFileId: file.id,
      }
      onAttachmentsChange([...attachments, draft])
    },
    [attachments, onAttachmentsChange]
  )

  const handleAdd = useCallback(
    (files: File[]) => {
      const valid: AttachmentDraft[] = []
      for (const f of files) {
        const result = validateFile(f)
        if (!result.valid) continue
        if (attachments.length + valid.length >= MAX_ATTACHMENTS_COUNT) break
        const previewUrl = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined
        valid.push({
          id: crypto.randomUUID(),
          name: f.name,
          size: f.size,
          previewUrl,
          mimeType: f.type,
          file: f,
        })
      }
      if (valid.length > 0) {
        onAttachmentsChange([...attachments, ...valid])
      }
    },
    [attachments, onAttachmentsChange]
  )

  const handleRemove = useCallback(
    (id: string) => {
      const item = attachments.find((a) => a.id === id)
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl)
      onAttachmentsChange(attachments.filter((a) => a.id !== id))
    },
    [attachments, onAttachmentsChange]
  )

  const filePreviews = attachments.map(toFilePreview)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold">Attachments</h2>
        <p className="mt-1 text-[15px] text-muted-foreground">
          Attach images or drawings to support decision context. Optional.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {errors.map((e, i) => (
            <p key={i}>{e}</p>
          ))}
        </div>
      )}

      <AssetManager
        files={filePreviews}
        onAdd={handleAdd}
        onRemove={handleRemove}
        maxFiles={MAX_ATTACHMENTS_COUNT}
        maxSizeBytes={MAX_ATTACHMENT_SIZE_BYTES}
        acceptedTypes="image/*,.pdf,.png,.jpg,.jpeg,.webp,.gif"
      />

      <div className="flex flex-wrap items-center gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setPickerOpen(true)}
          disabled={attachments.length >= MAX_ATTACHMENTS_COUNT}
          aria-label="Attach from library"
        >
          <Link2 className="mr-2 h-4 w-4" />
          Attach from library
        </Button>
      </div>

      <AttachmentPicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        projectId={projectId}
        onSelect={handleAddFromLibrary}
        excludeFileIds={attachments.map((a) => a.libraryFileId).filter(Boolean) as string[]}
        mode="select"
      />

      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={onContinue}
          className="rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          style={{ backgroundColor: 'rgb(0 82 204)', color: 'white' }}
        >
          Continue to recipients
        </button>
      </div>
    </div>
  )
}
