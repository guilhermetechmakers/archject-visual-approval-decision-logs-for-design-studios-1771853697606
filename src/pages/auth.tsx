import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { useSignup, useLogin, useResendVerification } from '@/hooks/use-auth'
import { getAuthErrorMessage } from '@/api/auth'
import { SignupConsent } from '@/components/terms'
import { useActiveTerms } from '@/hooks/use-terms'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
})

const signupSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(100, 'Max 100 characters'),
  last_name: z.string().min(1, 'Last name is required').max(100, 'Max 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(10, 'Password must be at least 10 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]+$/,
      'Password must include uppercase, lowercase, digit, and special character'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  company: z.string().max(200).optional(),
  terms_accepted: z.boolean().refine((v) => v === true, {
    message: 'You must accept the Terms of Service',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type LoginFormData = z.infer<typeof loginSchema>
type SignupFormData = z.infer<typeof signupSchema>

export function AuthPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated, isLoading: authLoading, login } = useAuth()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const pathTab = location.pathname === '/signup' ? 'signup' : 'login'
  const [tab, setTab] = useState(tabParam === 'signup' ? 'signup' : pathTab)

  useEffect(() => {
    if (tabParam === 'signup' || tabParam === 'login') setTab(tabParam)
    else setTab(pathTab)
  }, [tabParam, pathTab])

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname
  const redirectTo = from && from.startsWith('/dashboard') ? from : '/dashboard'

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate, redirectTo])
  const [signupSuccess, setSignupSuccess] = useState<{ maskedEmail: string; email: string } | null>(null)

  const signupMutation = useSignup()
  const loginMutation = useLogin()
  const resendMutation = useResendVerification()

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      confirmPassword: '',
      company: '',
      terms_accepted: false,
    },
  })

  const { data: activeTerms } = useActiveTerms()

  const onLogin = async (data: LoginFormData) => {
    try {
      const res = await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      })
      const token = res.accessToken ?? res.sessionToken
      login(res.user, token)
      toast.success('Welcome back!')
      navigate(redirectTo)
    } catch (err) {
      const msg = getAuthErrorMessage(err)
      toast.error(msg)
      const code = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : undefined
      if (code === 'EMAIL_NOT_VERIFIED') {
        navigate(`/verify-email?email=${encodeURIComponent(data.email)}`)
      }
    }
  }

  const onSignup = async (data: SignupFormData) => {
    if (!activeTerms?.id) {
      toast.error('Unable to load Terms of Service. Please try again.')
      return
    }
    try {
      const res = await signupMutation.mutateAsync({
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        password: data.password,
        company: data.company || undefined,
        terms_accepted: true,
        terms_version_id: activeTerms.id,
      })
      setSignupSuccess({ maskedEmail: res.masked_email, email: data.email })
      toast.success('Check your email to verify your account')
    } catch (err) {
      toast.error(getAuthErrorMessage(err))
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
        <div className="flex flex-col items-center gap-4">
          <div
            className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
            aria-hidden
          />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (signupSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
        <div className="w-full max-w-md animate-in-up">
          <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
            Archject
          </Link>
          <Card className="shadow-card">
            <CardHeader>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                <span className="text-2xl text-success" aria-hidden>
                  ✓
                </span>
              </div>
              <CardTitle className="text-center">Check your email</CardTitle>
              <CardDescription className="text-center">
                We sent a verification link to {signupSuccess.maskedEmail}. Click the link to activate your account and
                continue to Archject.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                className="w-full"
                onClick={async () => {
                  if (!signupSuccess.email) return
                  try {
                    await resendMutation.mutateAsync({ email: signupSuccess.email })
                    toast.success('Verification email sent')
                  } catch (err) {
                    toast.error(getAuthErrorMessage(err))
                  }
                }}
                isLoading={resendMutation.isPending}
                disabled={resendMutation.isPending}
              >
                Resend email
              </Button>
              <Button
                variant="outline"
                className="w-full text-muted-foreground"
                onClick={() => {
                  setSignupSuccess(null)
                  signupForm.reset()
                }}
              >
                Change email
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                Already verified?{' '}
                <Link to="/auth?tab=login" className="text-primary hover:underline">
                  Log in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
      <div className="w-full max-w-md animate-in-up">
        <Link to="/" className="mb-8 block text-center text-xl font-bold text-primary">
          Archject
        </Link>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-center">Welcome to Archject</CardTitle>
            <CardDescription className="text-center">
              Sign in to your studio or create a new account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col gap-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 border-[#D1D5DB] bg-white hover:bg-muted/50"
                onClick={() => {
                  const redirect = encodeURIComponent(redirectTo)
                  window.location.href = `/api/auth/oauth/google?redirect=${redirect}`
                }}
                aria-label="Continue with Google"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 border-[#D1D5DB] bg-white hover:bg-muted/50" disabled aria-label="Continue with Apple (coming soon)">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                Continue with Apple (coming soon)
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 border-[#D1D5DB] bg-white hover:bg-muted/50" disabled aria-label="Continue with Microsoft (coming soon)">
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#f25022" d="M1 1h10v10H1z"/>
                  <path fill="#00a4ef" d="M1 13h10v10H1z"/>
                  <path fill="#7fba00" d="M13 1h10v10H13z"/>
                  <path fill="#ffb900" d="M13 13h10v10H13z"/>
                </svg>
                Continue with Microsoft (coming soon)
              </Button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <Tabs value={tab} onValueChange={setTab} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="mt-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@studio.com"
                      {...loginForm.register('email')}
                      className={loginForm.formState.errors.email ? 'border-destructive' : ''}
                      aria-invalid={!!loginForm.formState.errors.email}
                    />
                    {loginForm.formState.errors.email && (
                      <p className="text-sm text-destructive" role="alert">
                        {loginForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <Link to="/password-reset" className="text-sm text-primary hover:underline">
                        Forgot password?
                      </Link>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      {...loginForm.register('password')}
                      className={loginForm.formState.errors.password ? 'border-destructive' : ''}
                      aria-invalid={!!loginForm.formState.errors.password}
                    />
                    {loginForm.formState.errors.password && (
                      <p className="text-sm text-destructive" role="alert">
                        {loginForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="remember-me"
                      checked={loginForm.watch('rememberMe')}
                      onCheckedChange={(checked) => loginForm.setValue('rememberMe', !!checked)}
                    />
                    <Label htmlFor="remember-me" className="text-sm font-normal cursor-pointer">
                      Remember me
                    </Label>
                  </div>
                  <Button type="submit" className="w-full" isLoading={loginMutation.isPending}>
                    Log in
                  </Button>
                </form>
                <p className="mt-4 text-center text-sm text-muted-foreground">
                  Need to verify your email?{' '}
                  <Link to="/verify-email" className="text-primary hover:underline">
                    Resend verification
                  </Link>
                </p>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First name</Label>
                      <Input
                        id="first_name"
                        placeholder="Jane"
                        {...signupForm.register('first_name')}
                        className={signupForm.formState.errors.first_name ? 'border-destructive' : ''}
                        aria-invalid={!!signupForm.formState.errors.first_name}
                      />
                      {signupForm.formState.errors.first_name && (
                        <p className="text-sm text-destructive" role="alert">
                          {signupForm.formState.errors.first_name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last name</Label>
                      <Input
                        id="last_name"
                        placeholder="Doe"
                        {...signupForm.register('last_name')}
                        className={signupForm.formState.errors.last_name ? 'border-destructive' : ''}
                        aria-invalid={!!signupForm.formState.errors.last_name}
                      />
                      {signupForm.formState.errors.last_name && (
                        <p className="text-sm text-destructive" role="alert">
                          {signupForm.formState.errors.last_name.message}
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
                      {...signupForm.register('email')}
                      className={signupForm.formState.errors.email ? 'border-destructive' : ''}
                      aria-invalid={!!signupForm.formState.errors.email}
                    />
                    {signupForm.formState.errors.email && (
                      <p className="text-sm text-destructive" role="alert">
                        {signupForm.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company">Studio name (optional)</Label>
                    <Input
                      id="company"
                      placeholder="Acme Design Studio"
                      {...signupForm.register('company')}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Min 10 chars, include A-Z, a-z, 0-9, special"
                      {...signupForm.register('password')}
                      className={signupForm.formState.errors.password ? 'border-destructive' : ''}
                      aria-invalid={!!signupForm.formState.errors.password}
                    />
                    {signupForm.formState.errors.password && (
                      <p className="text-sm text-destructive" role="alert">
                        {signupForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm password</Label>
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Re-enter password"
                      {...signupForm.register('confirmPassword')}
                      className={signupForm.formState.errors.confirmPassword ? 'border-destructive' : ''}
                      aria-invalid={!!signupForm.formState.errors.confirmPassword}
                    />
                    {signupForm.formState.errors.confirmPassword && (
                      <p className="text-sm text-destructive" role="alert">
                        {signupForm.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  <SignupConsent
                    checked={signupForm.watch('terms_accepted')}
                    onCheckedChange={(checked) => signupForm.setValue('terms_accepted', checked)}
                    error={signupForm.formState.errors.terms_accepted?.message}
                    disabled={!activeTerms}
                  />
                  <Button
                    type="submit"
                    className="w-full"
                    isLoading={signupMutation.isPending}
                    disabled={!activeTerms}
                  >
                    Sign up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              <Link to="/help" className="text-primary hover:underline">
                Need help?
              </Link>
            </p>
          </CardContent>
        </Card>
        <p className="mt-6 text-center text-xs text-muted-foreground">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
