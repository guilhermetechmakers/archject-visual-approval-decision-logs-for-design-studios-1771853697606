import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
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
import { Select } from '@/components/ui/select'
import { leadsApi } from '@/api/leads'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Max 100 characters'),
  email: z.string().email('Valid email required'),
  studioName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  studioSize: z.string().optional(),
  message: z.string().max(2000).optional(),
  website: z.string().max(0).optional(),
})

type FormData = z.infer<typeof schema>

interface DemoRequestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STUDIO_SIZES: { value: string; label: string }[] = [
  { value: '1-5', label: '1–5 people' },
  { value: '6-15', label: '6–15 people' },
  { value: '16-50', label: '16–50 people' },
  { value: '50+', label: '50+ people' },
]

export function DemoRequestForm({ open, onOpenChange }: DemoRequestFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      email: '',
      studioName: '',
      phone: '',
      studioSize: '',
      message: '',
      website: '',
    },
  })

  const onSubmit = async (data: FormData) => {
    if (data.website) {
      return
    }
    try {
      await leadsApi.submitDemo({
        name: data.name,
        email: data.email,
        studioName: data.studioName || undefined,
        phone: data.phone || undefined,
        studioSize: data.studioSize || undefined,
        message: data.message || undefined,
      })
      toast.success('Demo request received. We\'ll be in touch soon.')
      form.reset()
      onOpenChange(false)
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to submit'
      toast.error(msg)
    }
  }

  const isPending = form.formState.isSubmitting

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onClose={() => onOpenChange(false)}
        showClose={true}
      >
        <DialogHeader>
          <DialogTitle>Book a demo</DialogTitle>
          <DialogDescription>
            Tell us about your setup and we&apos;ll schedule a walkthrough of Archject.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="demo-name">Name *</Label>
              <Input
                id="demo-name"
                {...form.register('name')}
                placeholder="Your name"
                aria-invalid={!!form.formState.errors.name}
              />
              {form.formState.errors.name && (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-email">Email *</Label>
              <Input
                id="demo-email"
                type="email"
                {...form.register('email')}
                placeholder="you@studio.com"
                aria-invalid={!!form.formState.errors.email}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive" role="alert">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-studio">Studio name</Label>
            <Input
              id="demo-studio"
              {...form.register('studioName')}
              placeholder="Acme Design Studio"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="demo-phone">Phone</Label>
              <Input
                id="demo-phone"
                type="tel"
                {...form.register('phone')}
                placeholder="+1 (555) 000-0000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="demo-size">Studio size</Label>
              <Select
                id="demo-size"
                options={STUDIO_SIZES}
                value={form.watch('studioSize') || ''}
                onValueChange={(v) => form.setValue('studioSize', v)}
                placeholder="Select size"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="demo-message">Message</Label>
            <Textarea
              id="demo-message"
              {...form.register('message')}
              placeholder="Tell us about your workflow..."
              rows={3}
              className="resize-none"
            />
          </div>

          <input
            type="text"
            {...form.register('website')}
            className="absolute -left-[9999px]"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
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
