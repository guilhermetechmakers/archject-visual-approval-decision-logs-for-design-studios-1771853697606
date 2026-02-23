import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OptionEditorItem } from './option-editor-item'
import type { DecisionOptionDraft } from '@/api/decisions-create'

function generateId() {
  return `opt-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export interface OptionsEditorProps {
  title: string
  description: string
  options: DecisionOptionDraft[]
  onTitleChange: (title: string) => void
  onDescriptionChange: (description: string) => void
  onOptionsChange: (options: DecisionOptionDraft[]) => void
  onContinue: () => void
  errors?: { optionIndex?: number; message: string }[]
}

export function OptionsEditor({
  title,
  description,
  options,
  onTitleChange,
  onDescriptionChange,
  onOptionsChange,
  onContinue,
  errors = [],
}: OptionsEditorProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const addOption = () => {
    onOptionsChange([
      ...options,
      { id: generateId(), title: '', description: '', isDefault: false, isRecommended: false },
    ])
  }

  const updateOption = (index: number, updates: Partial<DecisionOptionDraft>) => {
    const next = [...options]
    next[index] = { ...next[index], ...updates }
    onOptionsChange(next)
  }

  const duplicateOption = (index: number) => {
    const opt = options[index]
    const dup: DecisionOptionDraft = {
      ...opt,
      id: generateId(),
      title: `${opt.title} (copy)`,
    }
    const next = [...options]
    next.splice(index + 1, 0, dup)
    onOptionsChange(next)
  }

  const removeOption = (index: number) => {
    const next = options.filter((_, i) => i !== index)
    onOptionsChange(next)
  }

  const handleDragStart = (index: number) => () => setDraggedIndex(index)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  const handleDrop = (dropIndex: number) => () => {
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }
    const next = [...options]
    const [removed] = next.splice(draggedIndex, 1)
    next.splice(dropIndex, 0, removed)
    onOptionsChange(next)
    setDraggedIndex(null)
  }

  const optionErrors = Object.fromEntries(
    errors.filter((e) => e.optionIndex != null).map((e) => [e.optionIndex!, e.message])
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[22px] font-semibold">Decision options</h2>
        <p className="mt-1 text-muted-foreground">
          Add options for the client to choose from. Include images or drawings to illustrate each option.
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="decision-title">Decision title *</Label>
          <Input
            id="decision-title"
            placeholder="e.g. Kitchen counter material"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="decision-desc">Description (optional)</Label>
          <Input
            id="decision-desc"
            placeholder="Brief context for the client"
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Options</Label>
          <Button variant="outline" size="sm" onClick={addOption}>
            <Plus className="mr-2 h-4 w-4" />
            Add option
          </Button>
        </div>

        {options.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-input py-12"
            onClick={addOption}
          >
            <Plus className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 font-medium">No options yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Click to add your first option
            </p>
            <Button variant="outline" className="mt-4">
              Add option
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {options.map((opt, i) => (
              <OptionEditorItem
                key={opt.id ?? i}
                option={opt}
                index={i}
                onUpdate={(u) => updateOption(i, u)}
                onDuplicate={() => duplicateOption(i)}
                onRemove={() => removeOption(i)}
                onDragStart={handleDragStart(i)}
                onDragOver={handleDragOver}
                onDrop={handleDrop(i)}
                isDragging={draggedIndex === i}
                error={optionErrors[i]}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end pt-4">
        <Button
          onClick={onContinue}
          disabled={options.length === 0 || options.some((o) => !o.title?.trim())}
        >
          Continue to settings
        </Button>
      </div>
    </div>
  )
}
