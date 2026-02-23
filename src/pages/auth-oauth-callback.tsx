import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/auth-context'
import { toast } from 'sonner'

export function AuthOAuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = searchParams.get('token')
    const redirect = searchParams.get('redirect') ?? '/dashboard'
    const err = searchParams.get('error')

    if (err) {
      setError(err)
      setTimeout(() => navigate('/auth', { replace: true }), 2000)
      return
    }

    if (!token) {
      setError('Missing token')
      setTimeout(() => navigate('/auth', { replace: true }), 2000)
      return
    }

    try {
      const userStr = searchParams.get('user')
      const user = userStr ? (JSON.parse(decodeURIComponent(userStr)) as { id: string; email: string; first_name: string; last_name: string; email_verified?: boolean }) : null
      if (user) {
        login({ ...user, email_verified: user.email_verified ?? true }, token)
        toast.success('Signed in successfully')
      } else {
        localStorage.setItem('auth_token', token)
      }
      const safeRedirect = redirect.startsWith('/') ? redirect : '/dashboard'
      navigate(safeRedirect, { replace: true })
    } catch {
      setError('Invalid response')
      setTimeout(() => navigate('/auth', { replace: true }), 2000)
    }
  }, [searchParams, login, navigate])

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
        <div className="text-center">
          <p className="text-destructive">Sign-in failed: {error}</p>
          <p className="mt-2 text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F7F9] px-4">
      <div className="flex flex-col items-center gap-4">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent"
          aria-hidden
        />
        <p className="text-sm text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  )
}
