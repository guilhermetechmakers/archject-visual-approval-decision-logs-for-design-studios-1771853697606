import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RateLimitNotice } from '@/components/ui/rate-limit-notice'
import { resendVerificationSchema, type ResendVerificationFormData } from '@/auth/validation'
import { cn } from '@/lib/utils'

const RESEND_COOLDOWN_SECONDS = 60

export interface ResendVerificationFormProps {
  defaultEmail?: string
  /** Hide email input when email is known (e.g. from URL) */
  hideEmailWhenKnown?: boolean
  onSubmit: (data: ResendVerificationFormData) => Promise<void>
  isLoading?: boolean
  /** Server rate limit: next allowed attempt timestamp (ms) */
  rateLimitUntil?: number | null
  /** Inline confirmation message when resend succeeded */
  confirmationMessage?: string | null
  className?: string
}

export function ResendVerificationForm({
  defaultEmail = '',
  hideEmailWhenKnown = false,
  onSubmit,
  isLoading = false,
  rateLimitUntil = null,
  confirmationMessage = null,
  className,
}: ResendVerificationFormProps) {
  const [cooldownRemaining, setCooldownRemaining] = useState(0)

  const form = useForm<ResendVerificationFormData>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: defaultEmail },
  })

  useEffect(() => {
    if (defaultEmail) form.setValue('email', defaultEmail)
  }, [defaultEmail, form])

  useEffect(() => {
    if (cooldownRemaining <= 0) return
    const id = setInterval(() => {
      setCooldownRemaining((prev) => {
        if (prev <= 1) return 0
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [cooldownRemaining])

  const handleSubmit = async (data: ResendVerificationFormData) => {
    await onSubmit(data)
    setCooldownRemaining(RESEND_COOLDOWN_SECONDS)
  }

  const isCooldown = cooldownRemaining > 0
  const isRateLimited = rateLimitUntil != null && rateLimitUntil > Date.now()
  const isDisabled = isLoading || isCooldown || isRateLimited

  const showEmailInput = !hideEmailWhenKnown || !defaultEmail

  return (
    <div className={cn('space-y-4', className)}>
      {confirmationMessage && (
        <p
          className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success"
          role="status"
          aria-live="polite"
        >
          {confirmationMessage}
        </p>
      )}

      {isRateLimited && rateLimitUntil && (
        <RateLimitNotice nextAllowedAt={rateLimitUntil}>
          You&apos;ve reached the limit for verification emails.
        </RateLimitNotice>
      )}

      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {showEmailInput && (
          <div className="space-y-2">
            <Label htmlFor="resend-email">Email</Label>
            <Input
              id="resend-email"
              type="email"
              placeholder="you@studio.com"
              {...form.register('email')}
              className={cn(
                form.formState.errors.email && 'border-destructive'
              )}
              aria-invalid={!!form.formState.errors.email}
              disabled={isDisabled}
            />
            {form.formState.errors.email && (
              <p className="text-sm text-destructive" role="alert">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
        )}
        <Button
          type="submit"
          variant="outline"
          className="w-full border-[#D1D5DB] text-[#6B7280] hover:bg-muted/50"
          disabled={isDisabled}
          isLoading={isLoading}
        >
          {isCooldown
            ? `Resend in ${cooldownRemaining}s`
            : 'Resend verification email'}
        </Button>
      </form>
    </div>
  )
}
