import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  requestPasswordReset,
  confirmPasswordReset,
  validatePasswordResetToken,
  getAuthErrorMessage,
} from '@/api/auth'
import { useAuth } from '@/contexts/auth-context'
import { PasswordStrengthMeter, getPasswordStrength } from '@/components/auth/password-strength-meter'
import { AuthCardHeader } from '@/components/auth/unified-auth-card'

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const confirmSchema = z
  .object({
    newPassword: z
      .string()
      .min(12, 'Password must be at least 12 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
        'Password must include uppercase, lowercase, digit, and special character'
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type RequestFormData = z.infer<typeof requestSchema>
type ConfirmFormData = z.infer<typeof confirmSchema>

const SUCCESS_MESSAGE =
  'If an account exists for this email, we sent a link. Check your inbox.'
const THROTTLE_SECONDS = 60

export function PasswordResetPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { login } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [confirmSuccess, setConfirmSuccess] = useState(false)
  const [throttleRemaining, setThrottleRemaining] = useState(0)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  })

  const confirmForm = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const newPassword = confirmForm.watch('newPassword')
  const strength = getPasswordStrength(newPassword)

  useEffect(() => {
    if (throttleRemaining <= 0) return
    const t = setInterval(() => setThrottleRemaining((r) => Math.max(0, r - 1)), 1000)
    return () => clearInterval(t)
  }, [throttleRemaining])

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      return
    }
    let cancelled = false
    validatePasswordResetToken(token).then((res) => {
      if (!cancelled) setTokenValid(res.valid)
    })
    return () => {
      cancelled = true
    }
  }, [token])

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

  const onConfirmSubmit = async (data: ConfirmFormData) => {
    if (!token) return
    if (strength.level === 'weak') {
      toast.error('Please choose a stronger password')
      return
    }
    try {
      const res = await confirmPasswordReset({ token, newPassword: data.newPassword })
      if (res.user && (res.sessionToken ?? (res as { accessToken?: string }).accessToken)) {
        login(res.user, res.sessionToken ?? (res as { accessToken?: string }).accessToken!)
        toast.success('Password reset successfully. Signed in.')
      } else {
        setConfirmSuccess(true)
        toast.success('Password reset successfully.')
      }
      navigate('/dashboard')
    } catch (err) {
      toast.error(getAuthErrorMessage(err))
    }
  }

  if (token) {
    if (tokenValid === null) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
          <div className="w-full max-w-md">
            <div className="flex flex-col items-center gap-4">
              <div
                className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
                aria-hidden
              />
              <p className="text-sm text-muted-foreground">Verifying link...</p>
            </div>
          </div>
        </div>
      )
    }

    if (!tokenValid) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
          <div className="w-full max-w-[420px] animate-in-up">
            <AuthCardHeader />
            <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl border border-[#E5E7EB]">
              <CardHeader>
                <CardTitle>Invalid or expired link</CardTitle>
                <CardDescription>
                  This password reset link is invalid or has expired. Please request a new one.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link to="/password-reset">
                  <Button className="w-full" style={{ backgroundColor: '#0052CC' }}>
                    Resend reset link
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" className="w-full">
                    Back to sign in
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    if (confirmSuccess) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
          <div className="w-full max-w-[420px] animate-in-up">
            <AuthCardHeader />
            <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl border border-[#E5E7EB]">
              <CardHeader>
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                  <span className="text-2xl text-success" aria-hidden>
                    ✓
                  </span>
                </div>
                <CardTitle className="text-center">Password reset</CardTitle>
                <CardDescription className="text-center">
                  Your password has been reset. You can now sign in.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/auth">
                  <Button className="w-full" style={{ backgroundColor: '#0052CC' }}>
                    Sign in
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl border border-[#E5E7EB]">
            <CardHeader>
              <CardTitle className="text-[22px]">Create a new password</CardTitle>
              <CardDescription>
                Enter your new password below. Use at least 12 characters with uppercase, lowercase, a number, and a
                symbol.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Min 12 chars, include A-Z, a-z, 0-9, special"
                      {...confirmForm.register('newPassword')}
                      className={confirmForm.formState.errors.newPassword ? 'border-destructive pr-10' : 'pr-10'}
                      autoComplete="new-password"
                      aria-invalid={!!confirmForm.formState.errors.newPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <PasswordStrengthMeter password={newPassword} />
                  {confirmForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive" role="alert">
                      {confirmForm.formState.errors.newPassword.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    {...confirmForm.register('confirmPassword')}
                    className={confirmForm.formState.errors.confirmPassword ? 'border-destructive' : ''}
                    autoComplete="new-password"
                    aria-invalid={!!confirmForm.formState.errors.confirmPassword}
                  />
                  {confirmForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive" role="alert">
                      {confirmForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  style={{ backgroundColor: '#0052CC' }}
                  disabled={strength.level === 'weak'}
                >
                  Set new password
                </Button>
              </form>
              <p className="text-center text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">
                  Back to sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl border border-[#E5E7EB]">
            <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <Mail className="mx-auto h-6 w-6 text-success" />
              </div>
              <CardTitle className="text-center text-[22px]">Check your inbox</CardTitle>
              <CardDescription className="text-center">
                {SUCCESS_MESSAGE} Contact support if you don&apos;t receive it.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link to="/auth">
                <Button className="w-full" style={{ backgroundColor: '#0052CC' }}>
                  Back to sign in
                </Button>
              </Link>
              <Link to="/password-reset">
                <Button className="w-full" variant="outline" disabled={throttleRemaining > 0}>
                  {throttleRemaining > 0
                    ? `Resend in ${throttleRemaining}s`
                    : 'Resend reset link'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
      <div className="w-full max-w-[420px] animate-in-up">
        <AuthCardHeader />
        <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.05)] rounded-xl border border-[#E5E7EB]">
          <CardHeader>
            <CardTitle className="text-[22px]">Reset your password</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@studio.com"
                  {...requestForm.register('email')}
                  className={requestForm.formState.errors.email ? 'border-destructive' : ''}
                  aria-invalid={!!requestForm.formState.errors.email}
                />
                {requestForm.formState.errors.email && (
                  <p className="text-sm text-destructive" role="alert">
                    {requestForm.formState.errors.email.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                className="w-full"
                style={{ backgroundColor: '#0052CC' }}
                isLoading={requestForm.formState.isSubmitting}
              >
                Send reset link
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
