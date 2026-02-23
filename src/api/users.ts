import { api } from '@/lib/api'

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
  created_at: string
  updated_at: string
  connected_providers: {
    provider: string
    email: string
    connected_at: string
    last_used: string
  }[]
  two_fa_enabled: boolean
  sessions: {
    id: string
    ip: string | null
    user_agent: string | null
    last_active_at: string
    created_at: string
  }[]
}

export async function getMe(): Promise<UserProfile> {
  return api.get<UserProfile>('/users/me')
}

export interface UpdateProfileRequest {
  first_name?: string
  last_name?: string
  company?: string
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

export async function revokeSession(sessionId: string): Promise<{ message: string }> {
  return api.post<{ message: string }>(`/users/me/sessions/${sessionId}/revoke`)
}
