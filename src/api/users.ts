import { api } from '@/lib/api'

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface UserProfile {
  id: string
  first_name: string
  last_name: string
  name: string
  email: string
  email_verified: boolean
  company: string | null
  avatar_url: string | null
  role: string
  timezone: string
  locale: string
  bio: string | null
  created_at?: string
  updated_at?: string
  connected_providers: {
    provider: string
    email: string
    connected_at: string
    last_used: string
  }[]
  two_fa_enabled: boolean
  two_fa_method?: 'totp' | 'sms' | null
  phone_masked?: string | null
  sessions: {
    id: string
    ip: string | null
    user_agent: string | null
    last_active_at: string
    created_at: string
    device_name?: string | null
    platform?: 'web' | 'ios' | 'android' | 'api' | 'other'
    geo_city?: string | null
    geo_country?: string | null
  }[]
}

export async function getMe(): Promise<UserProfile> {
  return api.get<UserProfile>('/users/me')
}

export interface UpdateProfileRequest {
  first_name?: string
  last_name?: string
  company?: string
  timezone?: string
  locale?: string
  bio?: string | null
  avatar_url?: string | null
}

export async function updateProfile(data: UpdateProfileRequest): Promise<UserProfile> {
  return api.patch<UserProfile>('/users/me', data)
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export async function changePassword(data: ChangePasswordRequest): Promise<{ message: string }> {
  return api.post<{ message: string }>('/users/me/password', data)
}

export async function revokeSession(sessionId: string, reason?: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/users/me/sessions/${sessionId}/revoke`, { reason })
}

export async function revokeAllSessions(password: string): Promise<{ message: string }> {
  return api.post<{ message: string }>('/users/me/sessions/revoke-all', { password })
}

export async function disconnectOAuth(provider: string): Promise<void> {
  return api.delete<void>(`/users/me/connections/${provider}`)
}

export interface AvatarUploadResult {
  avatar_url: string
  variants?: { thumb: string; small: string; large: string }
}

export async function uploadAvatar(file: File): Promise<AvatarUploadResult> {
  const token = localStorage.getItem('auth_token')
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${API_BASE}/uploads/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    credentials: 'include',
    body: formData,
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error((err as { message?: string }).message ?? 'Upload failed')
  }

  const data = (await response.json()) as { avatar_url: string; variants?: { thumb: string; small: string; large: string } }
  return { avatar_url: data.avatar_url, variants: data.variants }
}
