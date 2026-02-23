import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { PasswordStrengthMeter, getPasswordStrength } from '@/components/auth/password-strength-meter'
import { SignupConsent } from '@/components/terms'
import { cn } from '@/lib/utils'

export interface LoginFormData {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignupFormData {
  first_name: string
  last_name: string
  email: string
  password: string
  confirmPassword: string
  company?: string
  terms_accepted: boolean
}

type LoginFormProps = {
  form: UseFormReturn<LoginFormData>
  onSubmit: (data: LoginFormData) => void
  isLoading?: boolean
}

type SignupFormProps = {
  form: UseFormReturn<SignupFormData>
  onSubmit: (data: SignupFormData) => void
  isLoading?: boolean
  activeTerms?: { id: string } | null
}

export function LoginEmailPasswordForm({
  form,
  onSubmit,
  isLoading,
}: LoginFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          placeholder="you@studio.com"
          {...form.register('email')}
          className={cn(form.formState.errors.email && 'border-destructive')}
          aria-invalid={!!form.formState.errors.email}
          autoComplete="email"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-[#EF4444]" role="alert">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="login-password">Password</Label>
          <Link
            to="/password-reset"
            className="text-sm text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            {...form.register('password')}
            className={cn(
              'pr-10',
              form.formState.errors.password && 'border-destructive'
            )}
            aria-invalid={!!form.formState.errors.password}
            autoComplete="current-password"
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
        {form.formState.errors.password && (
          <p className="text-sm text-[#EF4444]" role="alert">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id="remember-me"
          checked={form.watch('rememberMe')}
          onCheckedChange={(checked) => form.setValue('rememberMe', !!checked)}
          aria-describedby="remember-me-label"
        />
        <Label id="remember-me-label" htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
          Remember me
        </Label>
      </div>
      <Button
        type="submit"
        className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90"
        isLoading={isLoading}
        disabled={isLoading}
      >
        Sign in
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Need to verify your email?{' '}
        <Link to="/verify-email" className="text-primary hover:underline">
          Resend verification
        </Link>
      </p>
    </form>
  )
}

export function SignupEmailPasswordForm({
  form,
  onSubmit,
  isLoading,
  activeTerms,
}: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const password = form.watch('password')
  const strength = getPasswordStrength(password)

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First name</Label>
          <Input
            id="first_name"
            placeholder="Jane"
            {...form.register('first_name')}
            className={cn(form.formState.errors.first_name && 'border-destructive')}
            aria-invalid={!!form.formState.errors.first_name}
            autoComplete="given-name"
          />
          {form.formState.errors.first_name && (
            <p className="text-sm text-[#EF4444]" role="alert">
              {form.formState.errors.first_name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last name</Label>
          <Input
            id="last_name"
            placeholder="Doe"
            {...form.register('last_name')}
            className={cn(form.formState.errors.last_name && 'border-destructive')}
            aria-invalid={!!form.formState.errors.last_name}
            autoComplete="family-name"
          />
          {form.formState.errors.last_name && (
            <p className="text-sm text-[#EF4444]" role="alert">
              {form.formState.errors.last_name.message}
            </p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-email">Email</Label>
        <Input
          id="signup-email"
          type="email"
          placeholder="you@studio.com"
          {...form.register('email')}
          className={cn(form.formState.errors.email && 'border-destructive')}
          aria-invalid={!!form.formState.errors.email}
          autoComplete="email"
        />
        {form.formState.errors.email && (
          <p className="text-sm text-[#EF4444]" role="alert">
            {form.formState.errors.email.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="company">Studio name (optional)</Label>
        <Input
          id="company"
          placeholder="Acme Design Studio"
          {...form.register('company')}
          autoComplete="organization"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="signup-password">Password</Label>
        <div className="relative">
          <Input
            id="signup-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Min 12 chars, include A-Z, a-z, 0-9, special"
            {...form.register('password')}
            className={cn(
              'pr-10',
              form.formState.errors.password && 'border-destructive'
            )}
            aria-invalid={!!form.formState.errors.password}
            autoComplete="new-password"
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
        <PasswordStrengthMeter password={password} />
        {form.formState.errors.password && (
          <p className="text-sm text-[#EF4444]" role="alert">
            {form.formState.errors.password.message}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm password</Label>
        <div className="relative">
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            placeholder="Re-enter password"
            {...form.register('confirmPassword')}
            className={cn(
              'pr-10',
              form.formState.errors.confirmPassword && 'border-destructive'
            )}
            aria-invalid={!!form.formState.errors.confirmPassword}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {form.formState.errors.confirmPassword && (
          <p className="text-sm text-[#EF4444]" role="alert">
            {form.formState.errors.confirmPassword.message}
          </p>
        )}
      </div>
        <SignupConsent
          checked={form.watch('terms_accepted')}
          onCheckedChange={(checked) => form.setValue('terms_accepted', !!checked)}
        error={form.formState.errors.terms_accepted?.message}
        disabled={!activeTerms}
      />
      <Button
        type="submit"
        className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90"
        isLoading={isLoading}
        disabled={!activeTerms || strength.level === 'weak'}
      >
        Create account
      </Button>
    </form>
  )
}
