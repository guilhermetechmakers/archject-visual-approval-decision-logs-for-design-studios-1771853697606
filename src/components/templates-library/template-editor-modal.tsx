import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, type SelectOption } from '@/components/ui/select'
import type { TemplateLibrary, TemplateLibraryItem, TemplateLibraryContent } from '@/types'

const TEMPLATE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'FINISHES', label: 'Finishes' },
  { value: 'LAYOUTS', label: 'Layouts' },
  { value: 'CHANGE_REQUESTS', label: 'Change Requests' },
  { value: 'VARIATIONS', label: 'Variations' },
  { value: 'PERMITS', label: 'Permits' },
]

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  type: z.enum(['FINISHES', 'LAYOUTS', 'CHANGE_REQUESTS', 'VARIATIONS', 'PERMITS']),
  tags: z.string().optional(),
  versionNote: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

export interface TemplateEditorModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: TemplateLibrary | TemplateLibraryItem | null
  onSubmit: (values: {
    name: string
    description?: string
    type: string
    content?: TemplateLibraryContent
    tags?: string[]
    versionNote?: string
  }) => Promise<void>
  isSubmitting?: boolean
}

export function TemplateEditorModal({
  open,
  onOpenChange,
  template,
  onSubmit,
  isSubmitting = false,
}: TemplateEditorModalProps) {
  const isEdit = !!template?.id

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      type: 'FINISHES',
      tags: '',
      versionNote: '',
    },
  })

  const typeValue = watch('type')

  useEffect(() => {
    if (template) {
      reset({
        name: template.name,
        description: template.description ?? '',
        type: template.type,
        tags: template.tags?.join(', ') ?? '',
        versionNote: '',
      })
    } else {
      reset({
        name: '',
        description: '',
        type: 'FINISHES',
        tags: '',
        versionNote: '',
      })
    }
  }, [template, open, reset])

  const handleFormSubmit = async (values: FormValues) => {
    const tags = values.tags
      ?.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    await onSubmit({
      name: values.name,
      description: values.description || undefined,
      type: values.type,
      content: template?.content,
      tags: tags?.length ? tags : undefined,
      versionNote: isEdit ? values.versionNote : undefined,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit template' : 'Create template'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update template details. Saving creates a new version.'
              : 'Create a new decision template for reuse across projects.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g. Material selection"
              className="mt-1"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the template"
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="type">Type</Label>
            <Select
              value={typeValue}
              onValueChange={(v) => setValue('type', v as FormValues['type'])}
              options={TEMPLATE_TYPE_OPTIONS}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              {...register('tags')}
              placeholder="finishes, materials, flooring"
              className="mt-1"
            />
          </div>

          {isEdit && (
            <div>
              <Label htmlFor="versionNote">Version note</Label>
              <Input
                id="versionNote"
                {...register('versionNote')}
                placeholder="What changed in this version"
                className="mt-1"
              />
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : isEdit ? 'Save' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
