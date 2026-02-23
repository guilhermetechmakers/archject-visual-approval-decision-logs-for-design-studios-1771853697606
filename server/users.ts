import { Router, Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { db } from './db.js'
import { getUserIdFromAccessToken } from './auth-utils.js'

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

usersRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const user = db.prepare(
      'SELECT id, first_name, last_name, email, email_verified, company, role, avatar_url FROM users WHERE id = ?'
    ).get(userId) as {
      id: string
      first_name: string
      last_name: string
      email: string
      email_verified: number
      company: string | null
      role: string | null
      avatar_url: string | null
    } | undefined

    if (!user) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' })
    }

    const oauthAccounts = db.prepare(
      'SELECT provider, provider_email, created_at, last_used_at FROM oauth_accounts WHERE user_id = ?'
    ).all(userId) as { provider: string; provider_email: string | null; created_at: string; last_used_at: string | null }[]

    const totpEnabled = !!db.prepare('SELECT 1 FROM totp_secrets WHERE user_id = ? AND enabled_at IS NOT NULL').get(userId)

    const sessions = db.prepare(
      `SELECT id, ip, user_agent, last_active_at, created_at
       FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_active_at DESC`
    ).all(userId) as { id: string; ip: string | null; user_agent: string | null; last_active_at: string; created_at: string }[]

    return res.json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      email_verified: Boolean(user.email_verified),
      company: user.company,
      role: user.role ?? 'owner',
      avatar_url: user.avatar_url,
      connected_providers: oauthAccounts.map((o) => ({
        provider: o.provider,
        email: o.provider_email,
        connected_at: o.created_at,
        last_used: o.last_used_at,
      })),
      two_fa_enabled: totpEnabled,
      sessions: sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        user_agent: s.user_agent,
        last_active_at: s.last_active_at,
        created_at: s.created_at,
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
    const { first_name, last_name, company } = req.body

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

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message:
          'New password must be at least 10 characters with uppercase, lowercase, digit, and special character',
      })
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
      password_hash: string | null
    } | undefined

    if (!user || !user.password_hash) {
      return res.status(400).json({
        code: 'NO_PASSWORD',
        message: 'This account uses OAuth sign-in. Set a password first.',
      })
    }

    const valid = await bcrypt.compare(currentPassword, user.password_hash)
    if (!valid) {
      return res.status(401).json({ code: 'INVALID_PASSWORD', message: 'Current password is incorrect' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 10)
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(
      passwordHash,
      userId
    )

    return res.json({ message: 'Password updated successfully' })
  } catch (err) {
    console.error('[Users] Password change error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

usersRouter.get('/me/sessions', requireAuth, (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId

    const sessions = db.prepare(
      `SELECT id, ip, user_agent, last_active_at, created_at
       FROM sessions WHERE user_id = ? AND revoked_at IS NULL ORDER BY last_active_at DESC`
    ).all(userId) as { id: string; ip: string | null; user_agent: string | null; last_active_at: string; created_at: string }[]

    return res.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        user_agent: s.user_agent,
        last_active_at: s.last_active_at,
        created_at: s.created_at,
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

    const session = db.prepare('SELECT id FROM sessions WHERE id = ? AND user_id = ?').get(
      sessionId,
      userId
    ) as { id: string } | undefined

    if (!session) {
      return res.status(404).json({ code: 'SESSION_NOT_FOUND', message: 'Session not found' })
    }

    db.prepare('UPDATE sessions SET revoked_at = datetime("now") WHERE id = ?').run(sessionId)

    return res.json({ message: 'Session revoked' })
  } catch (err) {
    console.error('[Users] Revoke session error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})
