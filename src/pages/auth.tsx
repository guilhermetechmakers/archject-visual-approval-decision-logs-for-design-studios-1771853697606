import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSignup, useLogin, useResendVerification } from '@/hooks/use-auth'
import { getAuthErrorMessage, is2FARequired } from '@/api/auth'
import { verify2FA, sendSMSOTP } from '@/api/twofa'
import {
  UnifiedAuthCard,
  AuthCardHeader,
  AuthCardFooter,
} from '@/components/auth/unified-auth-card'
import { AuthToggle, type AuthTab } from '@/components/auth/auth-toggle'
import { SSOButtons } from '@/components/auth/sso-buttons'
import { LoginEmailPasswordForm, SignupEmailPasswordForm } from '@/components/auth/email-password-form'
import { TwoFactorModal, type TwoFAStep } from '@/components/auth/two-factor-modal'
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
    .min(12, 'Password must be at least 12 characters')
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
  const [tab, setTab] = useState<AuthTab>(tabParam === 'signup' ? 'signup' : pathTab)

  useEffect(() => {
    if (tabParam === 'signup' || tabParam === 'login') setTab(tabParam as AuthTab)
    else setTab(pathTab as AuthTab)
  }, [tabParam, pathTab])

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname
  const redirectTo = from && from.startsWith('/dashboard') ? from : '/dashboard'

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [authLoading, isAuthenticated, navigate, redirectTo])

  const [signupSuccess, setSignupSuccess] = useState<{ maskedEmail: string; email: string } | null>(null)
  const [twofaStep, setTwofaStep] = useState<TwoFAStep | null>(null)

  const signupMutation = useSignup()
  const loginMutation = useLogin()
  const resendMutation = useResendVerification()
  const { data: activeTerms } = useActiveTerms()

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

  const onLogin = async (data: LoginFormData) => {
    try {
      const res = await loginMutation.mutateAsync({
        email: data.email,
        password: data.password,
        rememberMe: data.rememberMe,
      })
      if (is2FARequired(res)) {
        setTwofaStep({
          sessionTempToken: res.session_temp_token,
          twofaMethods: res.twofa_methods,
          phoneMasked: res.phone_masked,
        })
        return
      }
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

  const on2FAVerify = async (
    code: string,
    method: 'totp' | 'sms' | 'recovery',
    rememberDevice: boolean
  ) => {
    if (!twofaStep) return
    const res = await verify2FA(
      twofaStep.sessionTempToken,
      code,
      method,
      rememberDevice
    )
    const token = res.accessToken ?? res.sessionToken
    login(res.user, token)
    toast.success('Welcome back!')
    setTwofaStep(null)
    navigate(redirectTo)
  }

  const on2FASendSms = async () => {
    if (!twofaStep) return
    const res = await sendSMSOTP('', 'login', twofaStep.sessionTempToken)
    if (res.sent) {
      toast.success('Verification code sent')
    } else {
      toast.error('Please wait before requesting another code.')
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
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <UnifiedAuthCard
            title="Check your email"
            description={`We sent a verification link to ${signupSuccess.maskedEmail}. Click the link to activate your account and continue to Archject.`}
          >
            <div className="space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/10">
                <span className="text-2xl text-[#10B981]" aria-hidden>✓</span>
              </div>
              <Button
                className="w-full bg-[#0052CC] hover:bg-[#0052CC]/90"
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
            </div>
          </UnifiedAuthCard>
        </div>
      </div>
    )
  }

  if (twofaStep) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
        <div className="w-full max-w-[420px] animate-in-up">
          <AuthCardHeader />
          <TwoFactorModal
            step={twofaStep}
            onVerify={on2FAVerify}
            onSendSms={twofaStep.twofaMethods.includes('sms') ? on2FASendSms : undefined}
            onBack={() => setTwofaStep(null)}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4 py-12">
      <div className="w-full max-w-[420px] animate-in-up">
        <AuthCardHeader />
        <UnifiedAuthCard
          title="Welcome to Archject"
          description="Sign in to your studio or create a new account"
        >
          <SSOButtons redirectTo={redirectTo} />
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with email</span>
            </div>
          </div>
          <AuthToggle value={tab} onChange={setTab} />
          {tab === 'login' ? (
            <LoginEmailPasswordForm
              form={loginForm}
              onSubmit={onLogin}
              isLoading={loginMutation.isPending}
            />
          ) : (
            <SignupEmailPasswordForm
              form={signupForm}
              onSubmit={onSignup}
              isLoading={signupMutation.isPending}
              activeTerms={activeTerms}
            />
          )}
          <p className="text-center text-sm text-muted-foreground">
            <Link to="/help" className="text-primary hover:underline">
              Need help?
            </Link>
          </p>
        </UnifiedAuthCard>
        <AuthCardFooter className="mt-6">
          By signing in, you agree to our{' '}
          <Link to="/terms" className="underline hover:text-foreground">
            Terms
          </Link>{' '}
          and{' '}
          <Link to="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
          .
        </AuthCardFooter>
      </div>
    </div>
  )
}
