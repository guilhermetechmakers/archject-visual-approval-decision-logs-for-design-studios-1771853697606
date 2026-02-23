import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { useVerifyEmail, useResendVerification } from '@/hooks/use-auth'
import type { ApiError } from '@/lib/api'
import { AuthCardHeader } from '@/components/auth/unified-auth-card'
import { VerificationCard, VerificationCardActions } from '@/components/auth/verification-card'
import { ResendVerificationForm } from '@/components/auth/resend-verification-form'
import type { ResendVerificationFormData } from '@/auth/validation'

type VerifyState =
  | 'verifying'
  | 'success'
  | 'already_verified'
  | 'expired'
  | 'invalid'
  | 'resend_success'
  | 'resend_error'
  | 'rate_limited'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token')
  const uidFromUrl = searchParams.get('uid')
  const emailFromUrl = searchParams.get('email')
  const redirectParam = searchParams.get('redirect') ?? '/dashboard'

  const [state, setState] = useState<VerifyState>('verifying')
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null)
  const [resendConfirmation, setResendConfirmation] = useState<string | null>(null)

  const { login } = useAuth()
  const verifyMutation = useVerifyEmail()
  const resendMutation = useResendVerification()

  useEffect(() => {
    if (!tokenFromUrl) {
      setState(emailFromUrl ? 'expired' : 'invalid')
      return
    }

    verifyMutation.mutate(
      { token: tokenFromUrl, uid: uidFromUrl ?? undefined },
      {
        onSuccess: (data) => {
          if (data.user.email_verified && data.sessionToken) {
            setState('success')
            login(data.user, data.sessionToken)
            setTimeout(() => navigate(redirectParam), 3000)
          } else {
            setState('success')
          }
        },
        onError: (err) => {
          const apiErr = err as ApiError
          const code = apiErr?.code ?? apiErr?.data?.error
          if (code === 'TOKEN_EXPIRED') setState('expired')
          else if (code === 'ALREADY_VERIFIED') setState('already_verified')
          else setState('invalid')
        },
      }
    )
  }, [tokenFromUrl])

  const handleResend = async (data: ResendVerificationFormData) => {
    setResendConfirmation(null)
    try {
      await resendMutation.mutateAsync({
        email: data.email,
        uid: uidFromUrl ?? undefined,
      })
      setResendConfirmation('New verification email sent.')
      setState('resend_success')
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr?.status === 429 && apiErr?.data?.next_allowed_attempt_at) {
        setRateLimitUntil(new Date(apiErr.data.next_allowed_attempt_at as string).getTime())
        setState('rate_limited')
      } else {
        setState('resend_error')
      }
    }
  }

  const supportLink = (
    <p className="text-center text-sm text-[#6B7280]">
      Need help?{' '}
      <a
        href="mailto:support@archject.com"
        className="text-[#0052CC] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
      >
        Contact support
      </a>
    </p>
  )

  if (state === 'verifying') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <VerificationCard
            variant="neutral"
            title="Verifying your email..."
            description="Please wait while we confirm your account."
            statusMessage="Verification in progress"
          />
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <VerificationCard
            variant="success"
            title="Email Verified"
            description="Your account is now active. You can start using Archject to manage your design decisions and approvals."
            badge="Verified"
            statusMessage="Your account has been verified successfully."
          >
            <VerificationCardActions
              primary={{
                label: 'Go to Dashboard',
                onClick: () => navigate(redirectParam),
                autoFocus: true,
              }}
              secondary={{
                label: 'Log in as another user',
                href: '/auth?tab=login',
              }}
            />
          </VerificationCard>
        </div>
      </div>
    )
  }

  if (state === 'already_verified') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <VerificationCard
            variant="success"
            title="Already verified"
            description="This email has already been verified. You can log in to continue."
            statusMessage="Account already verified"
          >
            <VerificationCardActions
              primary={{
                label: 'Sign in',
                href: '/auth?tab=login',
              }}
            />
          </VerificationCard>
        </div>
      </div>
    )
  }

  if (state === 'resend_success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <VerificationCard
            variant="success"
            title="Check your email"
            description="We sent a new verification link. Click the link to verify your account."
            statusMessage="New verification email sent"
          >
            <ResendVerificationForm
              defaultEmail={emailFromUrl ?? ''}
              hideEmailWhenKnown={!!emailFromUrl}
              onSubmit={handleResend}
              isLoading={resendMutation.isPending}
              confirmationMessage={resendConfirmation}
            />
            <VerificationCardActions
              secondary={{
                label: 'Log in',
                href: '/auth?tab=login',
              }}
            />
          </VerificationCard>
          {supportLink}
        </div>
      </div>
    )
  }

  if (state === 'rate_limited' && rateLimitUntil) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <VerificationCard
            variant="error"
            title="Too many requests"
            description="Please wait before requesting another verification email."
            badge="Rate limited"
            statusMessage="Rate limit exceeded. Please wait before trying again."
          >
            <ResendVerificationForm
              defaultEmail={emailFromUrl ?? ''}
              onSubmit={handleResend}
              isLoading={resendMutation.isPending}
              rateLimitUntil={rateLimitUntil}
            />
            <VerificationCardActions
              secondary={{
                label: 'Back to login',
                href: '/auth?tab=login',
              }}
            />
          </VerificationCard>
          {supportLink}
        </div>
      </div>
    )
  }

  const isExpired = state === 'expired'
  const headline = isExpired
    ? 'Verification Link Expired'
    : 'Invalid Verification Link'
  const body = isExpired
    ? "This link has expired. Request a new one and we'll email it to you."
    : 'This link is invalid or has already been used. Request a new verification link.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
      <div className="w-full max-w-[420px] animate-in-up">
        <AuthCardHeader />
        <VerificationCard
          variant="error"
          title={headline}
          description={body}
          badge={isExpired ? 'Expired' : 'Invalid'}
          statusMessage={isExpired ? 'Verification link has expired' : 'Verification link is invalid'}
        >
          <ResendVerificationForm
            defaultEmail={emailFromUrl ?? ''}
            hideEmailWhenKnown={!!emailFromUrl}
            onSubmit={handleResend}
            isLoading={resendMutation.isPending}
            rateLimitUntil={rateLimitUntil}
            confirmationMessage={resendConfirmation}
          />
          <VerificationCardActions
            secondary={{
              label: 'Return to Login',
              href: '/auth?tab=login',
            }}
          />
        </VerificationCard>
        {supportLink}
      </div>
    </div>
  )
}
