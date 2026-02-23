import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { X, Paperclip, Loader2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { helpApi } from '@/api/help'
import { useCreateSupportTicket } from '@/hooks/use-help'

const MAX_FILES = 5
const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf']

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  email: z.string().email('Valid email required'),
  subject: z.string().min(1, 'Subject required').max(255),
  description: z.string().min(10, 'Description must be at least 10 characters'),
})

type FormData = z.infer<typeof schema>

interface ContactFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  source?: 'help-form' | 'demo' | 'landing'
  defaultSubject?: string
  prefilledName?: string
  prefilledEmail?: string
}

export function ContactForm({
  open,
  onOpenChange,
  source = 'help-form',
  defaultSubject,
  prefilledName,
  prefilledEmail,
}: ContactFormProps) {
  const [attachments, setAttachments] = useState<{ file: File; url?: string; filename: string; size: number; mime: string }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const createTicket = useCreateSupportTicket()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: prefilledName ?? '',
      email: prefilledEmail ?? '',
      subject: defaultSubject ?? '',
      description: '',
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter((f) => {
      if (f.size > MAX_FILE_SIZE) {
        toast.error(`${f.name} too large (max 10MB)`)
        return false
      }
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast.error(`${f.name}: only PNG, JPEG, GIF, PDF allowed`)
        return false
      }
      return true
    })
    const newAttachments = valid.map((f) => ({
      file: f,
      filename: f.name,
      size: f.size,
      mime: f.type,
    }))
    setAttachments((prev) => {
      const next = [...prev, ...newAttachments].slice(0, MAX_FILES)
      if (next.length > MAX_FILES) {
        toast.error(`Max ${MAX_FILES} files`)
      }
      return next.slice(0, MAX_FILES)
    })
    e.target.value = ''
  }

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index))
  }

  const onSubmit = async (data: FormData) => {
    try {
      let uploadedUrls: { url: string; filename: string; size: number; mime: string }[] = []
      if (attachments.length > 0) {
        const uploaded = await helpApi.uploadFiles(attachments.map((a) => a.file))
        uploadedUrls = uploaded.files
      }

      const res = await createTicket.mutateAsync({
        ...data,
        attachments: uploadedUrls.map((u) => u),
        source,
      })

      toast.success(`Support request submitted. Ticket ID: ${res.ticketId.slice(0, 8)}. We typically respond within 24 hours.`)
      form.reset()
      setAttachments([])
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onClose={() => onOpenChange(false)}
        showClose={true}
      >
        <DialogHeader>
          <DialogTitle>{source === 'demo' ? 'Request a demo' : 'Contact support'}</DialogTitle>
          <DialogDescription>
            {source === 'demo'
              ? 'Tell us about your setup and we\'ll schedule a walkthrough.'
              : 'We typically respond within 24 hours.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contact-name">Name</Label>
              <Input id="contact-name" {...form.register('name')} placeholder="Your name" />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact-email">Email</Label>
              <Input id="contact-email" type="email" {...form.register('email')} placeholder="you@studio.com" />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-subject">Subject</Label>
            <Input id="contact-subject" {...form.register('subject')} placeholder="Brief summary" />
            {form.formState.errors.subject && (
              <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-description">Description</Label>
            <Textarea
              id="contact-description"
              {...form.register('description')}
              placeholder="Describe your question or issue..."
              rows={4}
              className="resize-none"
            />
            {form.formState.errors.description && (
              <p className="text-xs text-destructive">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Attachments (optional)</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= MAX_FILES}
              >
                <Paperclip className="h-4 w-4 mr-1" />
                Add file
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.gif,.pdf"
                multiple
                className="hidden"
                onChange={handleFileChange}
              />
              {attachments.map((a, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
                >
                  {a.file.name}
                  <button
                    type="button"
                    onClick={() => removeAttachment(i)}
                    className="rounded p-0.5 hover:bg-muted-foreground/20"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">PNG, JPEG, GIF, PDF. Max 5 files, 10MB each.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createTicket.isPending}>
              {createTicket.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
