import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { leadsApi } from '@/api/leads'

const schema = z.object({
  email: z.string().email('Valid email required').max(320),
})

type FormData = z.infer<typeof schema>

interface NewsletterSignupProps {
  utmSource?: string
  className?: string
}

export function NewsletterSignup({ utmSource, className }: NewsletterSignupProps) {
  const [success, setSuccess] = useState(false)
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: FormData) => {
    try {
      await leadsApi.submitSignup({
        email: data.email,
        utmSource: utmSource || undefined,
      })
      toast.success("You're on the list. We'll notify you when we launch.")
      setSuccess(true)
      form.reset()
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to sign up'
      toast.error(msg)
    }
  }

  if (success) {
    return (
      <p className="text-sm text-success font-medium">
        Thanks for signing up! We&apos;ll be in touch.
      </p>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className={className}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-2">
          <Label htmlFor="newsletter-email" className="sr-only">
            Email
          </Label>
          <Input
            id="newsletter-email"
            type="email"
            placeholder="you@studio.com"
            {...form.register('email')}
            className={form.formState.errors.email ? 'border-destructive' : ''}
            aria-invalid={!!form.formState.errors.email}
            aria-describedby={form.formState.errors.email ? 'newsletter-error' : undefined}
          />
          {form.formState.errors.email && (
            <p id="newsletter-error" className="text-xs text-destructive" role="alert">
              {form.formState.errors.email.message}
            </p>
          )}
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting} className="sm:shrink-0">
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Subscribing...
            </>
          ) : (
            'Subscribe'
          )}
        </Button>
      </div>
    </form>
  )
}
