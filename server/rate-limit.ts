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
