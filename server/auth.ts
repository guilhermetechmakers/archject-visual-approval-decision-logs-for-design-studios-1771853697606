import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from './db.js'
import { sendVerificationEmail, sendPasswordResetEmail } from './mailer.js'
import { checkResendRateLimit, checkAuthRateLimit } from './rate-limit.js'
import {
  hashToken,
  createAccessToken,
  createRefreshToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  getRefreshTokenFromRequest,
  storeRefreshToken,
  validateRefreshToken,
  revokeRefreshToken,
  createSession,
} from './auth-utils.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const TOKEN_EXPIRY_HOURS = 24
const PASSWORD_RESET_EXPIRY_MINUTES = 60

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2)
  return `${visible}***@${domain}`
}

export const authRouter = Router()

authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { first_name, last_name, email, password, company, terms_accepted, terms_version_id } = req.body

    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'first_name, last_name, email, and password are required',
      })
    }

    if (!terms_accepted || !terms_version_id) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'You must accept the Terms of Service to sign up',
      })
    }

    if (first_name.length > 100 || last_name.length > 100) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Names must be at most 100 characters' })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid email address' })
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/
    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message:
          'Password must be at least 10 characters with uppercase, lowercase, digit, and special character',
      })
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email) as { id: string } | undefined
    if (existing) {
      return res.status(409).json({ code: 'EMAIL_EXISTS', message: 'An account with this email already exists' })
    }

    const id = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)

    db.prepare(
      `INSERT INTO users (id, first_name, last_name, email, email_verified, password_hash, company, verification_attempts_count)
       VALUES (?, ?, ?, ?, 0, ?, ?, 0)`
    ).run(id, first_name, last_name, email, passwordHash, company ?? null)

    const version = db.prepare('SELECT id FROM terms_versions WHERE id = ?').get(terms_version_id) as { id: string } | undefined
    if (version) {
      const acceptId = crypto.randomUUID()
      db.prepare(
        `INSERT INTO terms_acceptances (id, user_id, version_id, accepted_at, ip_address, user_agent)
         VALUES (?, ?, ?, datetime('now'), ?, ?)`
      ).run(acceptId, id, terms_version_id, req.ip ?? null, req.get('user-agent') ?? null)
    }

    const token = crypto.randomBytes(48).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    const verifyId = crypto.randomUUID()
    db.prepare(
      `INSERT INTO email_verifications (id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(verifyId, id, tokenHash, expiresAt.toISOString(), req.ip ?? null, req.get('user-agent') ?? null)

    db.prepare('UPDATE users SET verification_sent_at = ?, verification_attempts_count = 1 WHERE id = ?').run(
      new Date().toISOString(),
      id
    )

    const verifyBase = process.env.VERIFY_BASE_URL ?? 'http://localhost:5173'
    const verificationUrl = `${verifyBase}/verify-email?token=${token}`

    const sent = await sendVerificationEmail({
      firstName: first_name,
      email,
      verificationUrl,
      expiresAt,
      studioName: company,
    })

    if (!sent) {
      return res.status(503).json({
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'We could not send the verification email. Please try again later.',
      })
    }

    return res.status(201).json({
      message: 'Account created. Please check your email to verify.',
      masked_email: maskEmail(email),
      resend_cooldown_seconds: 60,
    })
  } catch (err) {
    console.error('[Auth] Signup error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Email and password are required' })
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as {
      id: string
      email: string
      email_verified: number
      password_hash: string
      first_name: string
      last_name: string
    } | undefined

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })
    }

    if (!user.email_verified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in',
      })
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({
      sessionToken: token,
      user: {
        id: user.id,
        email: user.email,
        email_verified: Boolean(user.email_verified),
        first_name: user.first_name,
        last_name: user.last_name,
      },
    })
  } catch (err) {
    console.error('[Auth] Login error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

authRouter.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const token = (req.body?.token ?? req.query?.token) as string | undefined
    if (!token || typeof token !== 'string' || token.length < 32) {
      return res.status(400).json({ error: 'TOKEN_INVALID', message: 'Invalid or missing verification token' })
    }

    const tokenHash = hashToken(token)
    const row = db.prepare(
      'SELECT ev.*, u.email_verified as user_verified FROM email_verifications ev JOIN users u ON ev.user_id = u.id WHERE ev.token_hash = ?'
    ).get(tokenHash) as {
      id: string
      user_id: string
      used_at: string | null
      expires_at: string
      user_verified: number
    } | undefined

    if (!row) {
      return res.status(400).json({ error: 'TOKEN_INVALID', message: 'This verification link is invalid' })
    }

    if (row.user_verified) {
      return res.status(400).json({
        error: 'ALREADY_VERIFIED',
        message: 'This email has already been verified',
      })
    }

    if (row.used_at) {
      return res.status(400).json({
        error: 'TOKEN_INVALID',
        message: 'This verification link has already been used',
      })
    }

    const expiresAt = new Date(row.expires_at)
    if (expiresAt < new Date()) {
      return res.status(400).json({
        error: 'TOKEN_EXPIRED',
        message: 'This verification link has expired',
      })
    }

    db.prepare('UPDATE email_verifications SET used_at = ? WHERE id = ?').run(new Date().toISOString(), row.id)
    db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      row.user_id
    )

    const user = db.prepare('SELECT id, email, first_name, last_name FROM users WHERE id = ?').get(row.user_id) as {
      id: string
      email: string
      first_name: string
      last_name: string
    }

    const sessionToken = jwt.sign(
      { sub: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    )

    return res.json({
      status: 'verified',
      user: {
        id: user.id,
        email: user.email,
        email_verified: true,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      sessionToken,
    })
  } catch (err) {
    console.error('[Auth] Verify email error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

authRouter.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const email = req.body?.email as string | undefined
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'

    let userId: string | null = null
    let targetEmail: string | null = null

    const authHeader = req.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7)
        const decoded = jwt.verify(token, JWT_SECRET) as { sub: string }
        const user = db.prepare('SELECT id, email FROM users WHERE id = ?').get(decoded.sub) as {
          id: string
          email: string
        } | undefined
        if (user) {
          userId = user.id
          targetEmail = user.email
        }
      } catch {
        // Invalid token
      }
    }

    if (!targetEmail && email) {
      const user = db.prepare('SELECT id, email FROM users WHERE email = ?').get(email) as {
        id: string
        email: string
      } | undefined
      if (user) {
        userId = user.id
        targetEmail = user.email
      }
    }

    if (!targetEmail) {
      return res.status(400).json({
        code: 'EMAIL_REQUIRED',
        message: 'Please provide your email address',
      })
    }

    const rateResult = checkResendRateLimit(userId ?? targetEmail, ip)
    if (!rateResult.allowed) {
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many verification emails sent. Please try again later.',
        next_allowed_attempt_at: rateResult.nextAllowedAt
          ? new Date(rateResult.nextAllowedAt).toISOString()
          : undefined,
      })
    }

    const user = db.prepare('SELECT id, first_name, company FROM users WHERE email = ?').get(targetEmail) as {
      id: string
      first_name: string
      company: string | null
    } | undefined

    if (!user) {
      return res.status(200).json({
        message: 'If an account exists with this email, a verification link has been sent.',
        next_allowed_attempt_at: undefined,
      })
    }

    const existingVerified = db.prepare('SELECT email_verified FROM users WHERE id = ?').get(user.id) as {
      email_verified: number
    }
    if (existingVerified.email_verified) {
      return res.status(400).json({
        code: 'ALREADY_VERIFIED',
        message: 'This email has already been verified',
      })
    }

    const token = crypto.randomBytes(48).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

    db.prepare(
      `INSERT INTO email_verifications (id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(crypto.randomUUID(), user.id, tokenHash, expiresAt.toISOString(), ip, req.get('user-agent') ?? null)

    db.prepare(
      'UPDATE users SET verification_sent_at = ?, verification_attempts_count = verification_attempts_count + 1 WHERE id = ?'
    ).run(new Date().toISOString(), user.id)

    const verifyBase = process.env.VERIFY_BASE_URL ?? 'http://localhost:5173'
    const verificationUrl = `${verifyBase}/verify-email?token=${token}`

    const sent = await sendVerificationEmail({
      firstName: user.first_name,
      email: targetEmail,
      verificationUrl,
      expiresAt,
      studioName: user.company ?? undefined,
    })

    if (!sent) {
      return res.status(503).json({
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'We could not send the verification email. Please try again later.',
      })
    }

    return res.json({
      message: 'Verification email sent. Please check your inbox.',
      next_allowed_attempt_at: rateResult.nextAllowedAt
        ? new Date(rateResult.nextAllowedAt).toISOString()
        : undefined,
    })
  } catch (err) {
    console.error('[Auth] Resend verification error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

authRouter.get('/verification-status', (req: Request, res: Response) => {
  try {
    const email = req.query.email as string | undefined
    if (!email) {
      return res.status(400).json({ code: 'EMAIL_REQUIRED', message: 'Email is required' })
    }

    const user = db.prepare(
      'SELECT email_verified, verification_sent_at FROM users WHERE email = ?'
    ).get(email) as { email_verified: number; verification_sent_at: string | null } | undefined

    if (!user) {
      return res.json({
        email,
        email_verified: false,
        last_sent_at: null,
        resend_available_at: null,
      })
    }

    const lastSent = user.verification_sent_at ? new Date(user.verification_sent_at).getTime() : null
    const resendAvailableAt = lastSent ? lastSent + 60 * 1000 : null

    return res.json({
      email,
      email_verified: Boolean(user.email_verified),
      last_sent_at: user.verification_sent_at,
      resend_available_at: resendAvailableAt ? new Date(resendAvailableAt).toISOString() : null,
    })
  } catch (err) {
    console.error('[Auth] Verification status error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})
