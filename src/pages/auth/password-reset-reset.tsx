import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  UnifiedAuthCard,
  AuthCardHeader,
} from '@/components/auth/unified-auth-card'
import {
  confirmPasswordReset,
  validatePasswordResetToken,
  getAuthErrorMessage,
} from '@/api/auth'
import { useAuth } from '@/contexts/auth-context'
import { PasswordStrengthMeter, getPasswordStrength } from '@/components/auth/password-strength-meter'

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

type ConfirmFormData = z.infer<typeof confirmSchema>

export type TokenStatus = 'valid' | 'expired' | 'invalid' | null

export function PasswordResetResetPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { login } = useAuth()
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>(null)
  const [showPassword, setShowPassword] = useState(false)

  const confirmForm = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const newPassword = confirmForm.watch('newPassword')
  const strength = getPasswordStrength(newPassword)

  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid')
      return
    }
    let cancelled = false
    validatePasswordResetToken(token).then((res) => {
      if (!cancelled) {
        setTokenStatus(res.valid ? 'valid' : 'invalid')
      }
    }).catch(() => {
      if (!cancelled) setTokenStatus('invalid')
    })
    return () => {
      cancelled = true
    }
  }, [token])


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
        toast.success('Password reset successfully.')
      }
      navigate('/auth', { replace: true })
    } catch (err) {
      toast.error(getAuthErrorMessage(err))
    }
  }

  if (tokenStatus === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-[#0052CC] border-t-transparent"
              aria-hidden
            />
            <p className="text-sm text-muted-foreground">Verifying link...</p>
          </div>
        </div>
      </div>
    )
  }

  if (tokenStatus !== 'valid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <UnifiedAuthCard
            title="Invalid or expired link"
            description="This password reset link is invalid or has expired. Please request a new one."
          >
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-lg bg-[#FEF3C7]/50 border border-[#F59E42]/30 p-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-[#F59E42]" aria-hidden />
                <p className="text-sm text-[#92400E]">
                  Links expire after 1 hour and can only be used once.
                </p>
              </div>
              <div className="space-y-3">
                <Link to="/auth/password-reset/request">
                  <Button className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]">
                    Request new reset link
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button variant="outline" className="w-full border-[#E5E7EB]">
                    Back to sign in
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
          title="Create a new password"
          description="Enter your new password below. Use at least 12 characters with uppercase, lowercase, a number, and a symbol."
        >
          <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 12 chars, include A-Z, a-z, 0-9, special"
                  {...confirmForm.register('newPassword')}
                  autoFocus
                  className={`rounded-lg border-[#D1D5DB] focus:border-[#0052CC] focus:ring-[#0052CC] pr-10 ${confirmForm.formState.errors.newPassword ? 'border-destructive' : ''}`}
                  autoComplete="new-password"
                  aria-invalid={!!confirmForm.formState.errors.newPassword}
                  aria-describedby="password-requirements"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring rounded"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthMeter password={newPassword} />
              <p id="password-requirements" className="text-xs text-muted-foreground">
                Minimum 12 characters, include uppercase, lowercase, number, and special character (@$!%*?&)
              </p>
              {confirmForm.formState.errors.newPassword && (
                <p className="text-sm text-[#EF4444]" role="alert">
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
                className={`rounded-lg border-[#D1D5DB] focus:border-[#0052CC] focus:ring-[#0052CC] ${confirmForm.formState.errors.confirmPassword ? 'border-destructive' : ''}`}
                autoComplete="new-password"
                aria-invalid={!!confirmForm.formState.errors.confirmPassword}
              />
              {confirmForm.formState.errors.confirmPassword && (
                <p className="text-sm text-[#EF4444]" role="alert">
                  {confirmForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>
            <Button
              type="submit"
              className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
              disabled={strength.level === 'weak'}
              isLoading={confirmForm.formState.isSubmitting}
            >
              Set new password
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/auth" className="text-[#0052CC] hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded">
              Back to sign in
            </Link>
          </p>
        </UnifiedAuthCard>
      </div>
    </div>
  )
}
