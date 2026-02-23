/** Auth and email verification API types */

export interface SignupRequest {
  first_name: string
  last_name: string
  email: string
  password: string
  company?: string
}

export interface SignupResponse {
  message: string
  masked_email: string
  resend_cooldown_seconds?: number
}

export interface ResendVerificationRequest {
  email?: string
}

export interface ResendVerificationResponse {
  message: string
  next_allowed_attempt_at?: string
}

export interface VerifyEmailRequest {
  token: string
}

export interface VerifyEmailResponse {
  status: 'verified'
  user: { id: string; email_verified: boolean }
  sessionToken?: string
}

export type VerifyEmailErrorCode =
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'ALREADY_VERIFIED'
  | 'RATE_LIMIT_EXCEEDED'
  | 'EMAIL_DELIVERY_FAILED'

export interface VerificationStatusResponse {
  email: string
  email_verified: boolean
  last_sent_at?: string
  resend_available_at?: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: { id: string; email: string; email_verified: boolean }
  sessionToken: string
}
