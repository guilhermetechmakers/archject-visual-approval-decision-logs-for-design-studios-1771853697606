import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  signup,
  login,
  verifyEmail,
  resendVerification,
  getVerificationStatus,
  getAuthErrorCode,
  type SignupRequest,
  type LoginRequest,
  type ResendVerificationRequest,
} from '@/api/auth'

export function useSignup() {
  return useMutation({
    mutationFn: (data: SignupRequest) => signup(data),
    onError: (error) => {
      const code = getAuthErrorCode(error)
      if (code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Too many attempts. Please try again later.')
      } else if (code === 'EMAIL_DELIVERY_FAILED') {
        toast.error("We couldn't send the verification email. Please try again.")
      } else {
        toast.error((error as Error).message ?? 'Signup failed')
      }
    },
  })
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginRequest) => login(data),
    onError: (error) => {
      const code = getAuthErrorCode(error)
      if (code === 'EMAIL_NOT_VERIFIED') {
        toast.error('Please verify your email before logging in.')
      } else {
        toast.error((error as Error).message ?? 'Login failed')
      }
    },
  })
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (data: { token: string; uid?: string } | string) =>
      verifyEmail(typeof data === 'string' ? data : data),
    onSuccess: (data) => {
      if (data.sessionToken) {
        localStorage.setItem('auth_token', data.sessionToken)
      }
      // Component handles success UI and redirect
    },
  })
}

export function useResendVerification() {
  return useMutation({
    mutationFn: (data?: ResendVerificationRequest) => resendVerification(data),
    onSuccess: () => {
      toast.success('Verification email sent. Check your inbox.')
    },
    onError: (error) => {
      const code = getAuthErrorCode(error)
      if (code === 'RATE_LIMIT_EXCEEDED') {
        toast.error('Too many resend attempts. Please wait before trying again.')
      } else {
        toast.error((error as Error).message ?? 'Failed to resend verification email')
      }
    },
  })
}

export function useVerificationStatus(email: string | null) {
  return useQuery({
    queryKey: ['verification-status', email],
    queryFn: () => {
      if (!email) throw new Error('Email is required')
      return getVerificationStatus(email)
    },
    enabled: Boolean(email),
  })
}
