import { useState, useEffect } from 'react'
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
import { supportApi } from '@/api/support'
import { getUserIdFromToken } from '@/lib/auth-utils'
import { isAuthenticated } from '@/lib/auth-utils'

const schema = z.object({
  email: z.string().email('Valid email required').optional().or(z.literal('')),
  message: z.string().max(5000).optional(),
})

type FormData = z.infer<typeof schema>

export interface ReportBrokenLinkModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  attemptedPath: string
}

export function ReportBrokenLinkModal({
  open,
  onOpenChange,
  attemptedPath,
}: ReportBrokenLinkModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isAuth = isAuthenticated()
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
      form.reset({ email: '', message: '' })
    }
  }, [open, form])

  const onSubmit = async (data: FormData) => {
    if (!userId && !data.email?.trim()) {
      form.setError('email', { message: 'Please provide an email so we can follow up.' })
      return
    }

    setIsSubmitting(true)
    try {
      await supportApi.reportBrokenLink({
        attemptedPath,
        userAgent: navigator.userAgent,
        message: data.message?.trim() || undefined,
        email: data.email?.trim() || undefined,
        userId: userId ?? undefined,
      })
      toast.success('Report submitted. We will look into this shortly.')
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit report')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMailto = () => {
    const subject = encodeURIComponent(`Broken link report: ${attemptedPath}`)
    const body = encodeURIComponent(
      `I encountered a broken link at:\n${attemptedPath}\n\nBrowser: ${navigator.userAgent}\n\nAdditional details:\n`
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
          <DialogTitle>Report broken link</DialogTitle>
          <DialogDescription>
            Help us fix this URL. We&apos;ll review your report and get back to you.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">URL:</span> {attemptedPath}
          </div>

          {!isAuth && (
            <div className="space-y-2">
              <Label htmlFor="report-email">Email (required for reply)</Label>
              <Input
                id="report-email"
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
            <Label htmlFor="report-message">Additional details (optional)</Label>
            <Textarea
              id="report-message"
              placeholder="Describe what you were trying to do..."
              rows={3}
              className="resize-none"
              {...form.register('message')}
            />
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit report'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
