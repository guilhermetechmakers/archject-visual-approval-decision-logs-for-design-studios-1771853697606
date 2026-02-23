import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  UnifiedAuthCard,
  AuthCardHeader,
} from '@/components/auth/unified-auth-card'
import {
  requestPasswordReset,
  getAuthErrorMessage,
} from '@/api/auth'

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

type RequestFormData = z.infer<typeof requestSchema>

const SUCCESS_MESSAGE =
  'If an account exists for this email, a password reset link has been sent.'
const THROTTLE_SECONDS = 60

export function PasswordResetRequestPage() {
  const [submitted, setSubmitted] = useState(false)
  const [throttleRemaining, setThrottleRemaining] = useState(0)

  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    mode: 'onChange',
    defaultValues: { email: '' },
  })

  useEffect(() => {
    if (throttleRemaining <= 0) return
    const t = setInterval(() => setThrottleRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [throttleRemaining])

  const onRequestSubmit = async (data: RequestFormData) => {
    try {
      await requestPasswordReset(data.email)
      setSubmitted(true)
      setThrottleRemaining(THROTTLE_SECONDS)
      toast.success(SUCCESS_MESSAGE)
    } catch (err) {
      const msg = getAuthErrorMessage(err)
      toast.error(msg)
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined
      if (code === 'RATE_LIMIT_EXCEEDED') {
        const retry = err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { retry_after?: number } }).data?.retry_after
          : THROTTLE_SECONDS
        setThrottleRemaining(retry ?? THROTTLE_SECONDS)
      }
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <UnifiedAuthCard
            title="Check your inbox"
            description={`${SUCCESS_MESSAGE} Contact support if you don't receive it.`}
          >
            <div className="space-y-6">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/10">
                <Mail className="h-6 w-6 text-[#10B981]" aria-hidden />
              </div>
              <p className="text-center text-sm text-muted-foreground" aria-live="polite">
                Check your spam folder if you don&apos;t see it. For security, we don&apos;t reveal whether an account exists.
              </p>
              <div className="space-y-3">
                <Link to="/auth">
                  <Button className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                    Back to sign in
                  </Button>
                </Link>
                <Link to="/auth/password-reset/request">
                  <Button
                    variant="outline"
                    className="w-full border-[#E5E7EB] text-[#6B7280] hover:bg-[#F7F7F9]"
                    disabled={throttleRemaining > 0}
                  >
                    {throttleRemaining > 0
                      ? `Resend in ${throttleRemaining}s`
                      : 'Resend reset link'}
                  </Button>
                </Link>
              </div>
            </div>
          </UnifiedAuthCard>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
      <div className="w-full max-w-[420px] animate-in-up">
        <AuthCardHeader />
        <UnifiedAuthCard
          title="Reset your password"
          description="Enter your email and we'll send you a secure link to set a new password."
        >
          <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@studio.com"
                {...requestForm.register('email')}
                className={
                  requestForm.formState.errors.email
                    ? 'border-destructive focus-visible:ring-destructive'
                    : 'border-[#D1D5DB] focus-visible:ring-[#0052CC]'
                }
                aria-invalid={!!requestForm.formState.errors.email}
                aria-describedby={requestForm.formState.errors.email ? 'email-error' : 'email-helper'}
                autoComplete="email"
                autoFocus
              />
              <p id="email-helper" className="text-xs text-muted-foreground">
                Max 5 requests per 15 minutes per email. Links expire in 1 hour.
              </p>
              {requestForm.formState.errors.email && (
                <p id="email-error" className="text-sm text-destructive" role="alert" aria-live="polite">
                  {requestForm.formState.errors.email.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70"
              disabled={requestForm.formState.isSubmitting}
              isLoading={requestForm.formState.isSubmitting}
            >
              Send reset link
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              <Link
                to="/auth"
                className="text-[#0052CC] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
              >
                Back to sign in
              </Link>
            </p>
          </form>
        </UnifiedAuthCard>
      </div>
    </div>
  )
}
