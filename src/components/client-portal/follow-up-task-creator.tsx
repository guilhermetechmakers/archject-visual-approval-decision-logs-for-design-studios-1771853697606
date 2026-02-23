import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface FollowUpTaskCreatorProps {
  onCreate: (title: string, description?: string) => Promise<void>
  disabled?: boolean
  className?: string
}

export function FollowUpTaskCreator({
  onCreate,
  disabled = false,
  className,
}: FollowUpTaskCreatorProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!title.trim()) return
    setIsSubmitting(true)
    try {
      await onCreate(title.trim(), description.trim() || undefined)
      setTitle('')
      setDescription('')
      setOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className={cn('', className)}>
      {!open ? (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <Plus className="h-4 w-4" />
          Create follow-up task
        </Button>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">New follow-up task</h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title"
            disabled={isSubmitting}
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full min-h-[80px] rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            disabled={isSubmitting}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
              Create
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
