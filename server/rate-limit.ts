/** In-memory rate limiting. Replace with Redis for production. */

interface RateLimitEntry {
  count: number
  firstAt: number
}

const perUser = new Map<string, RateLimitEntry>()
const perIp = new Map<string, RateLimitEntry>()

const PER_USER_LIMIT = 5
const PER_USER_WINDOW_MS = 24 * 60 * 60 * 1000
const PER_IP_LIMIT = 20
const PER_IP_WINDOW_MS = 60 * 60 * 1000

function checkLimit(
  map: Map<string, RateLimitEntry>,
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean; nextAllowedAt?: number } {
  const now = Date.now()
  const entry = map.get(key)

  if (!entry) {
    map.set(key, { count: 1, firstAt: now })
    return { allowed: true }
  }

  if (now - entry.firstAt > windowMs) {
    map.set(key, { count: 1, firstAt: now })
    return { allowed: true }
  }

  if (entry.count >= limit) {
    const nextAllowedAt = entry.firstAt + windowMs
    return { allowed: false, nextAllowedAt }
  }

  entry.count++
  return { allowed: true }
}

export function checkResendRateLimit(
  userId: string | null,
  ip: string
): { allowed: boolean; nextAllowedAt?: number; reason?: string } {
  if (userId) {
    const userResult = checkLimit(perUser, userId, PER_USER_LIMIT, PER_USER_WINDOW_MS)
    if (!userResult.allowed) {
      return {
        allowed: false,
        nextAllowedAt: userResult.nextAllowedAt,
        reason: 'RATE_LIMIT_EXCEEDED',
      }
    }
  }

  const ipResult = checkLimit(perIp, ip, PER_IP_LIMIT, PER_IP_WINDOW_MS)
  if (!ipResult.allowed) {
    return {
      allowed: false,
      nextAllowedAt: ipResult.nextAllowedAt,
      reason: 'RATE_LIMIT_EXCEEDED',
    }
  }

  return { allowed: true }
}

/** Auth rate limit: login/signup - 5 attempts per 15 min per IP */
const authPerIp = new Map<string, RateLimitEntry>()
const AUTH_IP_LIMIT = 5
const AUTH_IP_WINDOW_MS = 15 * 60 * 1000

export function checkAuthRateLimit(ip: string): { allowed: boolean; nextAllowedAt?: number } {
  return checkLimit(authPerIp, ip, AUTH_IP_LIMIT, AUTH_IP_WINDOW_MS)
}

/** Password reset request: 5 per hour per IP, 3 per hour per email */
const passwordResetPerIp = new Map<string, RateLimitEntry>()
const passwordResetPerEmail = new Map<string, RateLimitEntry>()
const PASSWORD_RESET_IP_LIMIT = 5
const PASSWORD_RESET_EMAIL_LIMIT = 3
const PASSWORD_RESET_WINDOW_MS = 60 * 60 * 1000

export function checkPasswordResetRequestLimit(
  ip: string,
  email: string
): { allowed: boolean; nextAllowedAt?: number; retryAfter?: number } {
  const ipResult = checkLimit(passwordResetPerIp, ip, PASSWORD_RESET_IP_LIMIT, PASSWORD_RESET_WINDOW_MS)
  if (!ipResult.allowed) {
    return {
      allowed: false,
      nextAllowedAt: ipResult.nextAllowedAt,
      retryAfter: ipResult.nextAllowedAt ? Math.ceil((ipResult.nextAllowedAt - Date.now()) / 1000) : 3600,
    }
  }
  const emailKey = email.trim().toLowerCase()
  const emailResult = checkLimit(
    passwordResetPerEmail,
    emailKey,
    PASSWORD_RESET_EMAIL_LIMIT,
    PASSWORD_RESET_WINDOW_MS
  )
  if (!emailResult.allowed) {
    return {
      allowed: false,
      nextAllowedAt: emailResult.nextAllowedAt,
      retryAfter: emailResult.nextAllowedAt ? Math.ceil((emailResult.nextAllowedAt - Date.now()) / 1000) : 3600,
    }
  }
  return { allowed: true }
}

/** Password reset submit: 10 attempts per hour per IP, 5 per token */
const passwordResetSubmitPerIp = new Map<string, RateLimitEntry>()
const passwordResetSubmitPerToken = new Map<string, RateLimitEntry>()
const PASSWORD_RESET_SUBMIT_IP_LIMIT = 10
const PASSWORD_RESET_SUBMIT_TOKEN_LIMIT = 5

export function checkPasswordResetSubmitLimit(
  ip: string,
  tokenHash: string
): { allowed: boolean; nextAllowedAt?: number; retryAfter?: number } {
  const ipResult = checkLimit(
    passwordResetSubmitPerIp,
    ip,
    PASSWORD_RESET_SUBMIT_IP_LIMIT,
    PASSWORD_RESET_WINDOW_MS
  )
  if (!ipResult.allowed) {
    return {
      allowed: false,
      nextAllowedAt: ipResult.nextAllowedAt,
      retryAfter: ipResult.nextAllowedAt ? Math.ceil((ipResult.nextAllowedAt - Date.now()) / 1000) : 3600,
    }
  }
  const tokenResult = checkLimit(
    passwordResetSubmitPerToken,
    tokenHash,
    PASSWORD_RESET_SUBMIT_TOKEN_LIMIT,
    PASSWORD_RESET_WINDOW_MS
  )
  if (!tokenResult.allowed) {
    return {
      allowed: false,
      nextAllowedAt: tokenResult.nextAllowedAt,
      retryAfter: tokenResult.nextAllowedAt ? Math.ceil((tokenResult.nextAllowedAt - Date.now()) / 1000) : 3600,
    }
  }
  return { allowed: true }
}
