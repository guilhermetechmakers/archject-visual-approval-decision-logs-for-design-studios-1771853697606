import { Navigate, useSearchParams } from 'react-router-dom'

/**
 * Legacy redirect: /password-reset and /password-reset?token=...
 * Redirect to the new auth routes for consistency.
 */
export function PasswordResetPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  if (!token) {
    return <Navigate to="/auth/password-reset/request" replace />
  }
  return <Navigate to={`/auth/password-reset/reset?token=${encodeURIComponent(token)}`} replace />
}
