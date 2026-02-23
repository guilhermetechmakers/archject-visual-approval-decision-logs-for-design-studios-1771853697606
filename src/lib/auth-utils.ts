/** Decode JWT payload to get user id. Returns null if invalid or missing. */
export function getUserIdFromToken(): string | null {
  try {
    const token = localStorage.getItem('auth_token')
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1]))
    return payload.sub ?? null
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('auth_token')
}
