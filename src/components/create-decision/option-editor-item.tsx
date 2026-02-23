import { GripVertical, Copy, Trash2 } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { AssetManager } from './asset-manager'
import { cn } from '@/lib/utils'
import type { DecisionOptionDraft } from '@/api/decisions-create'
import type { FilePreview } from './asset-manager'

export interface OptionEditorItemProps {
  option: DecisionOptionDraft
  index: number
  onUpdate: (updates: Partial<DecisionOptionDraft>) => void
  onDuplicate: () => void
  onRemove: () => void
  onDragStart?: () => void
  onDragOver?: (e: React.DragEvent) => void
  onDrop?: () => void
  isDragging?: boolean
  error?: string
}

export function OptionEditorItem({
  option,
  index,
  onUpdate,
  onDuplicate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  error,
}: OptionEditorItemProps) {
  const files: FilePreview[] = (option.attachments ?? []).map((a) => ({
    id: a.id,
    name: a.filePath.split('/').pop() ?? a.filePath,
    previewUrl: a.previewUrl,
  }))

  const handleAddFiles = (newFiles: File[]) => {
    const newAttachments = newFiles.map((f, i) => ({
      id: `local-${Date.now()}-${i}`,
      filePath: f.name,
      previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    }))
    onUpdate({
      attachments: [...(option.attachments ?? []), ...newAttachments],
    })
  }

  const handleRemoveFile = (id: string) => {
    onUpdate({
      attachments: (option.attachments ?? []).filter((a) => a.id !== id),
    })
  }

  return (
    <Card
      className={cn(
        'transition-all duration-200',
        isDragging && 'opacity-50',
        error && 'border-destructive'
      )}
      draggable={!!onDragStart}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader className="flex flex-row items-center gap-2 pb-2">
        <div
          className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-5 w-5" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Option {index + 1}</span>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="icon" onClick={onDuplicate} aria-label="Duplicate option">
            <Copy className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove option">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`option-title-${option.id ?? index}`}>Title *</Label>
          <Input
            id={`option-title-${option.id ?? index}`}
            placeholder="e.g. Quartz - Calacatta"
            value={option.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            className={error ? 'border-destructive' : ''}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`option-desc-${option.id ?? index}`}>Description (optional)</Label>
          <Textarea
            id={`option-desc-${option.id ?? index}`}
            placeholder="Brief description of this option"
            value={option.description ?? ''}
            onChange={(e) => onUpdate({ description: e.target.value })}
            rows={2}
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={option.isDefault ?? false}
              onCheckedChange={(c) => onUpdate({ isDefault: !!c })}
            />
            <span className="text-sm">Default</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={option.isRecommended ?? false}
              onCheckedChange={(c) => onUpdate({ isRecommended: !!c })}
            />
            <span className="text-sm">Recommended</span>
          </label>
        </div>
        <div>
          <Label className="mb-2 block">Images / attachments</Label>
          <AssetManager
            files={files}
            onAdd={handleAddFiles}
            onRemove={handleRemoveFile}
            maxFiles={5}
          />
        </div>
      </CardContent>
    </Card>
  )
}
