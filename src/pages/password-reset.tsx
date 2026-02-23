import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requestPasswordReset, confirmPasswordReset } from '@/api/auth'
import { useAuth } from '@/contexts/auth-context'

const requestSchema = z.object({
  email: z.string().email('Invalid email address'),
})

const confirmSchema = z.object({
  newPassword: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      'Password must include uppercase, lowercase, digit, and special character'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type RequestFormData = z.infer<typeof requestSchema>
type ConfirmFormData = z.infer<typeof confirmSchema>

export function PasswordResetPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { login } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [confirmSuccess, setConfirmSuccess] = useState(false)

  const requestForm = useForm<RequestFormData>({
    resolver: zodResolver(requestSchema),
    defaultValues: { email: '' },
  })

  const confirmForm = useForm<ConfirmFormData>({
    resolver: zodResolver(confirmSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  const onRequestSubmit = async (data: RequestFormData) => {
    try {
      await requestPasswordReset(data.email)
      setSubmitted(true)
      toast.success('If an account exists, a reset link has been sent.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset link')
    }
  }

  const onConfirmSubmit = async (data: ConfirmFormData) => {
    if (!token) return
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
      toast.error(err instanceof Error ? err.message : 'Invalid or expired reset link')
    }
  }

  if (token) {
    if (confirmSuccess) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
          <div className="w-full max-w-md animate-in-up">
            <Card>
              <CardHeader>
                <CardTitle>Password reset</CardTitle>
                <CardDescription>Your password has been reset. You can now sign in.</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/auth">
                  <Button className="w-full">Sign in</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-md animate-in-up">
          <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
            Archject
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>Set new password</CardTitle>
              <CardDescription>
                Enter your new password below
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={confirmForm.handleSubmit(onConfirmSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Min 10 chars, include A-Z, a-z, 0-9, special"
                    {...confirmForm.register('newPassword')}
                    className={confirmForm.formState.errors.newPassword ? 'border-destructive' : ''}
                  />
                  {confirmForm.formState.errors.newPassword && (
                    <p className="text-sm text-destructive">{confirmForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    {...confirmForm.register('confirmPassword')}
                    className={confirmForm.formState.errors.confirmPassword ? 'border-destructive' : ''}
                  />
                  {confirmForm.formState.errors.confirmPassword && (
                    <p className="text-sm text-destructive">{confirmForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Reset password
                </Button>
              </form>
              <p className="mt-6 text-center text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">
                  Back to login
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
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="w-full max-w-md animate-in-up">
          <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
            Archject
          </Link>
          <Card>
            <CardHeader>
              <CardTitle>Check your email</CardTitle>
              <CardDescription>
                If an account exists for that email, we&apos;ve sent a password reset link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/auth">
                <Button className="w-full">Back to login</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
      <div className="w-full max-w-md animate-in-up">
        <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
          Archject
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Reset password</CardTitle>
            <CardDescription>
              Enter your email and we&apos;ll send you a reset link
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@studio.com"
                  {...requestForm.register('email')}
                  className={requestForm.formState.errors.email ? 'border-destructive' : ''}
                />
                {requestForm.formState.errors.email && (
                  <p className="text-sm text-destructive">{requestForm.formState.errors.email.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full">
                Send reset link
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/auth" className="text-primary hover:underline">
                Back to login
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
