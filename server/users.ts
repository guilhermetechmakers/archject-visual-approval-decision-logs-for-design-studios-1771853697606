import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from './db.js'
import {
  getUserIdFromAccessToken,
  revokeAllRefreshTokensForUser,
  revokeAllSessionsForUser,
  revokeRefreshTokensForSession,
  logSessionAudit,
} from './auth-utils.js'
import { sendPasswordChangedEmail } from './mailer.js'
import { logAudit } from './twofa.js'
import {
  get2faStatus,
  maskPhone,
  regenerateRecoveryCodes,
  verify2faForUser,
  verifyRecoveryCode,
} from './twofa.js'

export const usersRouter = Router()

function requireAuth(req: Request, res: Response, next: () => void) {
  const userId = getUserIdFromAccessToken(req)
  if (!userId) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }
  ;(req as Request & { userId: string }).userId = userId
  next()
}

usersRouter.delete('/me/connections/:provider', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const provider = req.params.provider?.toLowerCase()
    if (!provider || !['google', 'apple', 'microsoft'].includes(provider)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid provider' })
    }

    const row = db.prepare(
      'SELECT id FROM oauth_accounts WHERE user_id = ? AND provider = ?'
    ).get(userId, provider) as { id: string } | undefined

    if (!row) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Connection not found' })
    }

    const hasPassword = db.prepare('SELECT 1 FROM users WHERE id = ? AND password_hash IS NOT NULL').get(userId)
    const oauthCount = db.prepare('SELECT COUNT(*) as c FROM oauth_accounts WHERE user_id = ?').get(userId) as { c: number }
    if (!hasPassword && oauthCount.c <= 1) {
      return res.status(400).json({
        code: 'LAST_AUTH_METHOD',
        message: 'Cannot disconnect. Add a password first to keep account access.',
      })
    }

    db.prepare('DELETE FROM oauth_accounts WHERE user_id = ? AND provider = ?').run(userId, provider)
    return res.status(204).send()
  } catch (err) {
    console.error('[Users] Disconnect OAuth error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

usersRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const user = db.prepare(
      'SELECT id, first_name, last_name, email, email_verified, company, role, avatar_url, 2fa_enabled, 2fa_method, phone_number, timezone, locale, bio FROM users WHERE id = ?'
    ).get(userId) as {
      id: string
      first_name: string
      last_name: string
      email: string
      email_verified: number
      company: string | null
      role: string | null
      avatar_url: string | null
    } & { '2fa_enabled'?: number; '2fa_method'?: string | null; 'phone_number'?: string | null; timezone?: string | null; locale?: string | null; bio?: string | null } | undefined

    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' })
    }

    const oauthAccounts = db.prepare(
      'SELECT provider, provider_email, created_at, last_used_at FROM oauth_accounts WHERE user_id = ?'
    ).all(userId) as { provider: string; provider_email: string | null; created_at: string; last_used_at: string | null }[]

    const twofaEnabled = user['2fa_enabled'] === 1
    const twofaMethod = user['2fa_method'] ?? null
    const phoneMasked = user.phone_number ? maskPhone(user.phone_number) : null

    const sessions = db.prepare(
      `SELECT id, ip, user_agent, last_active_at, created_at, device_name, platform, geo_city, geo_country
       FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_active_at DESC`
    ).all(userId) as {
      id: string
      ip: string | null
      user_agent: string | null
      last_active_at: string
      created_at: string
      device_name?: string | null
      platform?: string | null
      geo_city?: string | null
      geo_country?: string | null
    }[]

    const name = `${user.first_name} ${user.last_name}`.trim()
    return res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      name,
      email: user.email,
      email_verified: Boolean(user.email_verified),
      company: user.company,
      role: user.role ?? 'owner',
      avatar_url: user.avatar_url,
      timezone: user.timezone ?? 'UTC',
      locale: user.locale ?? 'en',
      bio: user.bio ?? null,
      connected_providers: oauthAccounts.map((o) => ({
        provider: o.provider,
        email: o.provider_email,
        connected_at: o.created_at,
        last_used: o.last_used_at,
      })),
      two_fa_enabled: twofaEnabled,
      two_fa_method: twofaMethod,
      phone_masked: phoneMasked,
      sessions: sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        user_agent: s.user_agent,
        last_active_at: s.last_active_at,
        created_at: s.created_at,
        device_name: s.device_name ?? null,
        platform: (s.platform as 'web' | 'ios' | 'android' | 'api' | 'other') ?? 'web',
        geo_city: s.geo_city ?? null,
        geo_country: s.geo_country ?? null,
      })),
    })
  } catch (err) {
    console.error('[Users] Get me error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

usersRouter.patch('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const { first_name, last_name, company, timezone, locale, bio } = req.body

    const updates: string[] = []
    const values: (string | null)[] = []

    if (typeof first_name === 'string' && first_name.length <= 100) {
      updates.push('first_name = ?')
      values.push(first_name)
    }
    if (typeof last_name === 'string' && last_name.length <= 100) {
      updates.push('last_name = ?')
      values.push(last_name)
    }
    if (company !== undefined) {
      updates.push('company = ?')
      values.push(typeof company === 'string' ? company : null)
    }
    if (typeof timezone === 'string' && timezone.length <= 64) {
      updates.push('timezone = ?')
      values.push(timezone)
    }
    if (typeof locale === 'string' && locale.length <= 16) {
      updates.push('locale = ?')
      values.push(locale)
    }
    if (bio !== undefined) {
      updates.push('bio = ?')
      values.push(typeof bio === 'string' ? bio : null)
    }

    if (updates.length === 0) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'No valid fields to update' })
    }

    updates.push('updated_at = datetime("now")')
    values.push(userId)

    db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values)

    const user = db.prepare(
      'SELECT id, first_name, last_name, email, email_verified, company, role FROM users WHERE id = ?'
    ).get(userId) as { id: string; first_name: string; last_name: string; email: string; email_verified: number; company: string | null; role: string | null }

    return res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      email_verified: Boolean(user.email_verified),
      company: user.company,
      role: user.role ?? 'owner',
    })
  } catch (err) {
    console.error('[Users] Patch me error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

const PASSWORD_POLICY_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/

async function handleChangePassword(
  req: Request,
  res: Response,
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  if (!PASSWORD_POLICY_REGEX.test(newPassword)) {
    res.status(400).json({
      code: 'VALIDATION_ERROR',
      message:
        'New password must be at least 12 characters with uppercase, lowercase, digit, and special character',
    })
    return
  }

  const user = db.prepare(
    'SELECT password_hash, first_name, email FROM users WHERE id = ?'
  ).get(userId) as {
    password_hash: string | null
    first_name: string
    email: string
  } | undefined

  if (!user || !user.password_hash) {
    res.status(400).json({
      code: 'NO_PASSWORD',
      message: 'This account uses OAuth sign-in. Set a password first.',
    })
    return
  }

  const valid = await bcrypt.compare(currentPassword, user.password_hash)
  if (!valid) {
    res.status(401).json({ code: 'INVALID_PASSWORD', message: 'Current password is incorrect' })
    return
  }

  const passwordHash = await bcrypt.hash(newPassword, 10)
  db.prepare(
    'UPDATE users SET password_hash = ?, updated_at = datetime("now"), last_password_changed_at = datetime("now") WHERE id = ?'
  ).run(passwordHash, userId)

  revokeAllRefreshTokensForUser(userId)
  revokeAllSessionsForUser(userId)

  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
  logAudit(userId, 'PASSWORD_CHANGED', {}, ip)
  await sendPasswordChangedEmail({ firstName: user.first_name, email: user.email })

  res.json({ message: 'Password updated successfully' })
}

usersRouter.post('/me/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Current password and new password are required',
      })
    }

    await handleChangePassword(req, res, userId, currentPassword, newPassword)
  } catch (err) {
    console.error('[Users] Password change error:', err)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

usersRouter.put('/me/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Current password and new password are required',
      })
    }

    await handleChangePassword(req, res, userId, currentPassword, newPassword)
  } catch (err) {
    console.error('[Users] Password change error:', err)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

usersRouter.get('/me/sessions', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50', 10)))
    const offset = Math.max(0, parseInt((req.query.offset as string) || '0', 10))

    const sessions = db.prepare(
      `SELECT id, ip, user_agent, last_active_at, created_at, device_name, platform, geo_city, geo_country
       FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_active_at DESC LIMIT ? OFFSET ?`
    ).all(userId, limit, offset) as {
      id: string
      ip: string | null
      user_agent: string | null
      last_active_at: string
      created_at: string
      device_name?: string | null
      platform?: string | null
      geo_city?: string | null
      geo_country?: string | null
    }[]

    return res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        user_agent: s.user_agent,
        last_active_at: s.last_active_at,
        created_at: s.created_at,
        device_name: s.device_name ?? null,
        platform: (s.platform as 'web' | 'ios' | 'android' | 'api' | 'other') ?? 'web',
        geo_city: s.geo_city ?? null,
        geo_country: s.geo_country ?? null,
      })),
    })
  } catch (err) {
    console.error('[Users] Get sessions error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

usersRouter.post('/me/sessions/:id/revoke', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const sessionId = req.params.id
    const { reason } = req.body ?? {}

    const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(
      sessionId,
      userId
    ) as { id: string } | undefined

    if (!session) {
      return res.status(404).json({ code: 'SESSION_NOT_FOUND', message: 'Session not found' })
    }

    const revokeReason = typeof reason === 'string' ? reason.slice(0, 512) : null
    const hasRevokeReason = db.prepare("SELECT 1 FROM pragma_table_info('sessions') WHERE name='revoke_reason'").get()
    if (hasRevokeReason) {
      db.prepare('UPDATE sessions SET revoked_at = datetime("now"), revoke_reason = ? WHERE id = ?').run(
        revokeReason,
        sessionId
      )
    } else {
      db.prepare('UPDATE sessions SET revoked_at = datetime("now") WHERE id = ?').run(sessionId)
    }

    revokeRefreshTokensForSession(sessionId)
    logSessionAudit(userId, sessionId, 'revoke', { reason: revokeReason })

    return res.json({ message: 'Session revoked' })
  } catch (err) {
    console.error('[Users] Revoke session error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

usersRouter.post('/me/sessions/revoke-all', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const { password } = req.body ?? {}

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Password is required to sign out of all devices',
      })
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
      password_hash: string | null
    } | undefined
    if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ code: 'INVALID_PASSWORD', message: 'Invalid password' })
    }

    revokeAllRefreshTokensForUser(userId)
    revokeAllSessionsForUser(userId)
    logSessionAudit(userId, null, 'logout', { action: 'revoke_all' })

    return res.json({ message: 'All sessions revoked' })
  } catch (err) {
    console.error('[Users] Revoke all sessions error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

usersRouter.get('/me/2fa/status', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const status = get2faStatus(userId)
    return res.json({
      enabled: status.enabled,
      method: status.method,
      phone_masked: status.phoneMasked,
      last_enforced_by_admin: status.lastEnforcedByAdmin,
    })
  } catch (err) {
    console.error('[Users] 2FA status error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

usersRouter.post('/me/2fa/recovery/regenerate', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const { password, code } = req.body

    if (!password || !code) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'password and code are required',
      })
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
      password_hash: string | null
    }
    if (!user?.password_hash) {
      return res.status(400).json({ code: 'NO_PASSWORD', message: 'Account has no password' })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ code: 'INVALID_PASSWORD', message: 'Invalid password' })
    }

    const verified =
      (await verify2faForUser(userId, code, 'totp')) ||
      (await verify2faForUser(userId, code, 'sms')) ||
      (await verifyRecoveryCode(userId, code))

    if (!verified) {
      return res.status(401).json({ code: 'INVALID_2FA_CODE', message: 'Invalid 2FA code' })
    }

    const recoveryCodes = await regenerateRecoveryCodes(userId)
    return res.json({ recovery_codes: recoveryCodes })
  } catch (err) {
    console.error('[Users] Regenerate recovery codes error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})
