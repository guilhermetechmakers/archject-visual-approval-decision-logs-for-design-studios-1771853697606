import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * Legacy redirect: /password-reset/confirm?token=... -> /auth/password-reset/reset?token=...
 */
export function PasswordResetRedirect() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  if (!token) {
    return <Navigate to="/auth/password-reset/request" replace />
  }

  return <Navigate to={`/auth/password-reset/reset?token=${encodeURIComponent(token)}`} replace />
}
