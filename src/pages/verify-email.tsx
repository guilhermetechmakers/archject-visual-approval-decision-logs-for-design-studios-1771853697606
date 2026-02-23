import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Mail, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { RateLimitNotice } from '@/components/ui/rate-limit-notice'
import { useVerifyEmail, useResendVerification } from '@/hooks/use-auth'
import type { ApiError } from '@/lib/api'
import { resendVerificationSchema, type ResendVerificationFormData } from '@/auth/validation'

type VerifyState =
  | 'verifying'
  | 'success'
  | 'already_verified'
  | 'expired'
  | 'invalid'
  | 'resend_success'
  | 'rate_limited'

export function VerifyEmailPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tokenFromUrl = searchParams.get('token')
  const emailFromUrl = searchParams.get('email')

  const [state, setState] = useState<VerifyState>('verifying')
  const [rateLimitUntil, setRateLimitUntil] = useState<number | null>(null)

  const verifyMutation = useVerifyEmail()
  const resendMutation = useResendVerification()

  const resendForm = useForm<ResendVerificationFormData>({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: emailFromUrl ?? '' },
  })

  useEffect(() => {
    if (!tokenFromUrl) {
      setState(emailFromUrl ? 'expired' : 'invalid')
      return
    }

    verifyMutation.mutate(tokenFromUrl, {
      onSuccess: (data) => {
        if (data.user.email_verified) {
          setState('success')
          localStorage.setItem('auth_token', data.sessionToken)
          setTimeout(() => navigate('/dashboard'), 3000)
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
    })
  }, [tokenFromUrl])

  useEffect(() => {
    if (emailFromUrl) resendForm.setValue('email', emailFromUrl)
  }, [emailFromUrl, resendForm])

  const handleResend = async (data: ResendVerificationFormData) => {
    try {
      await resendMutation.mutateAsync({ email: data.email })
      setState('resend_success')
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr?.status === 429 && apiErr?.data?.next_allowed_attempt_at) {
        setRateLimitUntil(Number(apiErr.data.next_allowed_attempt_at))
        setState('rate_limited')
      }
    }
  }

  if (state === 'verifying') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-md animate-in-up">
          <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
            Archject
          </Link>
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="mt-4 text-muted-foreground">Verifying your email...</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-md animate-in-up">
          <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
            Archject
          </Link>
          <Card className="shadow-card">
            <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
              </div>
              <Badge variant="success" className="mx-auto w-fit">
                Verified
              </Badge>
              <CardTitle className="text-center">Email verified — Welcome to Archject</CardTitle>
              <CardDescription className="text-center">
                Your account is now active. You can start using Archject to manage your design decisions and approvals.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button className="w-full" onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
              <Link to="/auth?tab=login" className="block">
                <Button variant="outline" className="w-full text-muted-foreground">
                  Log in as another user
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (state === 'already_verified') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-md animate-in-up">
          <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
            Archject
          </Link>
          <Card className="shadow-card">
            <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="h-6 w-6 text-success" aria-hidden />
              </div>
              <CardTitle className="text-center">Already verified</CardTitle>
              <CardDescription className="text-center">
                This email has already been verified. You can log in to continue.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth?tab=login" className="block">
                <Button className="w-full">Log in</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (state === 'resend_success') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-md animate-in-up">
          <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
            Archject
          </Link>
          <Card className="shadow-card">
            <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <Mail className="h-6 w-6 text-success" aria-hidden />
              </div>
              <CardTitle className="text-center">Check your email</CardTitle>
              <CardDescription className="text-center">
                We sent a new verification link. Click the link to verify your account.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setState('expired')}
                disabled={resendMutation.isPending}
              >
                Request another link
              </Button>
              <Link to="/auth?tab=login" className="block">
                <Button className="w-full">Log in</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (state === 'rate_limited' && rateLimitUntil) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-md animate-in-up">
          <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
            Archject
          </Link>
          <Card className="shadow-card">
            <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-6 w-6 text-destructive" aria-hidden />
              </div>
              <Badge variant="destructive" className="mx-auto w-fit">
                Rate limited
              </Badge>
              <CardTitle className="text-center">Too many requests</CardTitle>
              <CardDescription className="text-center">
                Please wait before requesting another verification email.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RateLimitNotice
                nextAllowedAt={rateLimitUntil ? new Date(rateLimitUntil).getTime() : undefined}
              >
                You&apos;ve reached the limit for verification emails.
              </RateLimitNotice>
              <Link to="/login" className="mt-4 block">
                <Button variant="outline" className="w-full">Back to login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const headline = state === 'expired'
    ? 'This verification link has expired.'
    : 'This verification link is invalid.'
  const body =
    state === 'expired'
      ? "Request a new link and we'll email it to you."
      : 'Request a new link or copy/paste the URL from your email.'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
      <div className="w-full max-w-md animate-in-up">
        <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
          Archject
        </Link>
        <Card className="shadow-card">
          <CardHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-6 w-6 text-destructive" aria-hidden />
            </div>
            <Badge variant="destructive" className="mx-auto w-fit">
              {state === 'expired' ? 'Expired' : 'Invalid'}
            </Badge>
            <CardTitle className="text-center">Link expired or invalid</CardTitle>
            <CardDescription className="text-center">
              {headline} {body}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={resendForm.handleSubmit(handleResend)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resend-email">Email</Label>
                <Input
                  id="resend-email"
                  type="email"
                  placeholder="you@studio.com"
                  {...resendForm.register('email')}
                  className={resendForm.formState.errors.email ? 'border-destructive' : ''}
                  aria-invalid={!!resendForm.formState.errors.email}
                />
                {resendForm.formState.errors.email && (
                  <p className="text-sm text-destructive" role="alert">
                    {resendForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" isLoading={resendMutation.isPending}>
                Resend verification email
              </Button>
            </form>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              Need help?{' '}
              <a href="mailto:support@archject.com" className="text-primary hover:underline">
                Contact support
              </a>
            </p>
            <Link to="/login" className="mt-4 block">
              <Button variant="outline" className="w-full text-muted-foreground">
                Back to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
