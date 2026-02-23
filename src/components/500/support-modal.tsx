import { useState, useEffect, useRef } from 'react'
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
import { errorsApi } from '@/api/errors'
import { getUserIdFromToken } from '@/lib/auth-utils'

const schema = z.object({
  email: z
    .string()
    .email('Valid email required')
    .optional()
    .or(z.literal('')),
  message: z.string().min(1, 'Message is required').max(2000, 'Max 2000 characters'),
})

type FormData = z.infer<typeof schema>

export interface SupportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  incidentId: string
  route: string
}

export function SupportModal({
  open,
  onOpenChange,
  incidentId,
  route,
}: SupportModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitRef = useRef<HTMLButtonElement>(null)
  const userId = getUserIdFromToken()

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      message: '',
    },
  })

  useEffect(() => {
    if (open) {
      form.reset({
        email: '',
        message: `I encountered a server error.\n\nIncident ID: ${incidentId}\nRoute: ${route}\n\n`,
      })
      setTimeout(() => submitRef.current?.focus(), 100)
    }
  }, [open, incidentId, route, form])

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true)
    try {
      await errorsApi.createSupportTicket({
        incidentId,
        userId: userId ?? undefined,
        email: data.email?.trim() || undefined,
        message: data.message.trim(),
      })
      toast.success('Support request sent. We will get back to you shortly.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send support request')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMailto = () => {
    const subject = encodeURIComponent(`Server Error - Incident ${incidentId}`)
    const body = encodeURIComponent(
      `I encountered a server error.\n\nIncident ID: ${incidentId}\nRoute: ${route}\n\nAdditional details:\n`
    )
    window.location.href = `mailto:support@archject.com?subject=${subject}&body=${body}`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg"
        onClose={() => onOpenChange(false)}
        showClose={true}
      >
        <DialogHeader>
          <DialogTitle>Contact support</DialogTitle>
          <DialogDescription>
            Describe what happened. Include the incident ID so we can look up the error quickly.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Incident ID:</span> {incidentId}
          </div>
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Route:</span> {route}
          </div>

          {!userId && (
            <div className="space-y-2">
              <Label htmlFor="support-email">Email (optional, for reply)</Label>
              <Input
                id="support-email"
                type="email"
                placeholder="you@studio.com"
                {...form.register('email')}
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="support-message">Message (required)</Label>
            <Textarea
              id="support-message"
              placeholder="Describe what you were doing when the error occurred..."
              rows={4}
              className="resize-none"
              maxLength={2000}
              {...form.register('message')}
            />
            <p className="text-xs text-muted-foreground">
              {form.watch('message')?.length ?? 0} / 2000
            </p>
            {form.formState.errors.message && (
              <p className="text-xs text-destructive">
                {form.formState.errors.message.message}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleMailto}>
              Email instead
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              ref={submitRef}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
