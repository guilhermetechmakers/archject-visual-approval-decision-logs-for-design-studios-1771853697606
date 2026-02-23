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
  email: z.string().email('Valid email required'),
  website: z.string().max(0).optional(),
})

type FormData = z.infer<typeof schema>

export function NewsletterSignupForm() {
  const [success, setSuccess] = useState(false)
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', website: '' },
  })

  const onSubmit = async (data: FormData) => {
    if (data.website) return
    try {
      await leadsApi.submitSignup({ email: data.email })
      toast.success('Thanks for signing up!')
      setSuccess(true)
      form.reset()
    } catch (err) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : 'Failed to sign up'
      toast.error(msg)
    }
  }

  if (success) {
    return (
      <p className="text-sm text-muted-foreground">
        Thanks for signing up! We&apos;ll be in touch.
      </p>
    )
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
      <Label htmlFor="newsletter-email" className="text-sm font-medium">
        Stay updated
      </Label>
      <div className="flex gap-2">
        <Input
          id="newsletter-email"
          type="email"
          placeholder="you@studio.com"
          {...form.register('email')}
          className="flex-1"
          aria-invalid={!!form.formState.errors.email}
        />
        <Button type="submit" size="sm" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Sign up'
          )}
        </Button>
      </div>
      <input
        type="text"
        {...form.register('website')}
        className="absolute -left-[9999px]"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden
      />
      {form.formState.errors.email && (
        <p className="text-xs text-destructive" role="alert">
          {form.formState.errors.email.message}
        </p>
      )}
    </form>
  )
}
