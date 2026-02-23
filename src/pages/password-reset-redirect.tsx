import { useEffect } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'

export function PasswordResetRedirect() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  useEffect(() => {
    // Legacy: /password-reset/confirm?token=... -> /password-reset?token=...
  }, [])

  if (!token) {
    return <Navigate to="/password-reset" replace />
  }

  return <Navigate to={`/password-reset?token=${encodeURIComponent(token)}`} replace />
}
