import { api } from '@/lib/api'

export interface TwoFAStatus {
  enabled: boolean
  method: 'totp' | 'sms' | null
  phone_masked: string | null
  last_enforced_by_admin?: boolean
}

export interface TOTPSetupResponse {
  otpauth_uri: string
  secret: string
  qr_data_uri: string
}

export interface Enable2FAResponse {
  enabled: boolean
  recovery_codes: string[]
}

export interface Login2FARequiredResponse {
  code: '2FA_REQUIRED'
  message: string
  session_temp_token: string
  twofa_methods: ('totp' | 'sms')[]
  phone_masked: string | null
}

export async function get2FAStatus(): Promise<TwoFAStatus> {
  return api.get<TwoFAStatus>('/users/me/2fa/status')
}

export async function getTOTPSetup(): Promise<TOTPSetupResponse> {
  return api.post<TOTPSetupResponse>('/auth/2fa/totp/setup')
}

export async function enableTOTP(verificationCode: string, password: string): Promise<Enable2FAResponse> {
  return api.post<Enable2FAResponse>('/auth/2fa/enable', {
    method: 'totp',
    verification_code: verificationCode,
    password,
  })
}

export async function enableSMS(
  phoneNumber: string,
  verificationCode: string,
  password: string
): Promise<Enable2FAResponse> {
  return api.post<Enable2FAResponse>('/auth/2fa/enable', {
    method: 'sms',
    verification_code: verificationCode,
    phone_number: phoneNumber,
    password,
  })
}

export async function disable2FA(password: string, code: string): Promise<{ disabled: boolean }> {
  return api.post<{ disabled: boolean }>('/auth/2fa/disable', { password, code })
}

export async function sendSMSOTP(
  phoneNumber: string,
  purpose: 'enable' | 'login',
  sessionTempToken?: string
): Promise<{ sent: boolean; cooldown_seconds?: number }> {
  const body: { phone_number?: string; purpose: 'enable' | 'login'; session_temp_token?: string } = {
    purpose,
  }
  if (phoneNumber) body.phone_number = phoneNumber
  if (sessionTempToken) body.session_temp_token = sessionTempToken
  return api.post<{ sent: boolean; cooldown_seconds?: number }>('/auth/2fa/send-sms', body)
}

export async function verify2FA(
  sessionTempToken: string,
  code: string,
  method: 'totp' | 'sms' | 'recovery',
  rememberDevice?: boolean
): Promise<{
  accessToken: string
  sessionToken: string
  user: { id: string; email: string; email_verified: boolean; first_name: string; last_name: string }
}> {
  return api.post('/auth/2fa/verify', {
    session_temp_token: sessionTempToken,
    code,
    method,
    remember_device: rememberDevice,
  })
}

export async function regenerateRecoveryCodes(
  password: string,
  code: string
): Promise<{ recovery_codes: string[] }> {
  return api.post<{ recovery_codes: string[] }>('/users/me/2fa/recovery/regenerate', {
    password,
    code,
  })
}
