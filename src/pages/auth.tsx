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
import { AlertBanner } from '@/components/ui/alert-banner'
import { useSignup, useLogin, useResendVerification } from '@/hooks/use-auth'
import { getAuthErrorMessage } from '@/api/auth'
import { SignupConsent } from '@/components/terms'
import { useActiveTerms } from '@/hooks/use-terms'

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
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
  company: z.string().max(200).optional(),
  terms_accepted: z.boolean().refine((v) => v === true, {
    message: 'You must accept the Terms of Service',
  }),
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
    defaultValues: { email: '', password: '' },
  })

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      company: '',
      terms_accepted: false,
    },
  })

  const { data: activeTerms } = useActiveTerms()

  const onLogin = async (data: LoginFormData) => {
    try {
      const res = await loginMutation.mutateAsync(data)
      login(res.user, res.sessionToken)
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
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="login">Log in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
                <TabsTrigger value="sso" disabled>
                  SSO (soon)
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
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
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
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
                    <Label htmlFor="company">Company / Studio (optional)</Label>
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

              <TabsContent value="sso">
                <AlertBanner variant="default" title="Coming soon">
                  OAuth and SSO providers (Google, Apple, Microsoft) will be available soon.
                </AlertBanner>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1" disabled>
                    Google
                  </Button>
                  <Button variant="outline" className="flex-1" disabled>
                    Apple
                  </Button>
                  <Button variant="outline" className="flex-1" disabled>
                    Microsoft
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1" disabled>
                  Google (coming soon)
                </Button>
                <Button variant="outline" className="flex-1" disabled>
                  Microsoft (coming soon)
                </Button>
              </div>
            </div>
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
