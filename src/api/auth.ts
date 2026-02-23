import { api, type ApiError } from '@/lib/api'

export interface SignupRequest {
  first_name: string
  last_name: string
  email: string
  password: string
  company?: string
  terms_accepted: boolean
  terms_version_id: string
}

export interface SignupResponse {
  message: string
  masked_email: string
  resend_cooldown_seconds?: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthUser {
  id: string
  email: string
  email_verified: boolean
  first_name: string
  last_name: string
}

export interface LoginResponse {
  sessionToken: string
  user: AuthUser
}

export interface VerifyEmailResponse {
  status: 'verified'
  user: AuthUser
  sessionToken: string
}

export interface ResendVerificationResponse {
  message: string
  next_allowed_attempt_at?: string
}

export interface VerificationStatusResponse {
  email: string
  email_verified: boolean
  last_sent_at: string | null
  resend_available_at: string | null
}

export async function signup(data: SignupRequest): Promise<SignupResponse> {
  return api.post<SignupResponse>('/auth/signup', data)
}

export async function login(data: LoginRequest): Promise<LoginResponse> {
  return api.post<LoginResponse>('/auth/login', data)
}

export async function verifyEmail(token: string): Promise<VerifyEmailResponse> {
  return api.post<VerifyEmailResponse>('/auth/verify-email', { token })
}

export interface ResendVerificationRequest {
  email?: string
}

export async function resendVerification(
  data?: ResendVerificationRequest
): Promise<ResendVerificationResponse> {
  return api.post<ResendVerificationResponse>('/auth/resend-verification', data ?? {})
}

export async function getVerificationStatus(email: string): Promise<VerificationStatusResponse> {
  return api.get<VerificationStatusResponse>(`/auth/verification-status?email=${encodeURIComponent(email)}`)
}

export function isAuthError(err: unknown): err is ApiError {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    typeof (err as ApiError).code === 'string'
  )
}

export function getAuthErrorCode(err: unknown): string | undefined {
  return isAuthError(err) ? err.code : undefined
}

export function getAuthErrorMessage(err: unknown): string {
  if (isAuthError(err)) return err.message
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred'
}
