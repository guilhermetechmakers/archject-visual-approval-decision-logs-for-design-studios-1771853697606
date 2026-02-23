/**
 * Attachments step: drag-and-drop images/drawings with previews and size/type restrictions.
 */
import { useCallback } from 'react'
import { AssetManager } from '@/components/create-decision/asset-manager'
import { validateFile, MAX_ATTACHMENTS_COUNT, MAX_ATTACHMENT_SIZE_BYTES } from '@/lib/validation'
import type { AttachmentDraft } from '@/api/decisions-create'

export interface AttachmentsStepProps {
  attachments: AttachmentDraft[]
  onAttachmentsChange: (attachments: AttachmentDraft[]) => void
  onContinue: () => void
  errors?: string[]
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
}: AttachmentsStepProps) {
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
