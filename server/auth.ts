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
  getUserIdFromAccessToken,
} from './auth-utils.js'
import {
  createSessionTempToken,
  validateSessionTempToken,
  consumeSessionTempToken,
  createDeviceToken,
  validateDeviceToken,
  get2faStatus,
  verify2faForUser,
  verifyRecoveryCode,
  maskPhone,
  sendSMSOTP,
  check2faVerifyLockout,
  record2faVerifyAttempt,
  clear2faVerifyAttempts,
  logAudit,
  setupTOTP,
  enableTOTP,
  enableSMS,
  disable2FA,
  normalizePhone,
  isValidPhone,
} from './twofa.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const DEVICE_TOKEN_COOKIE = 'archject_device'
const TOKEN_EXPIRY_HOURS = 24
const PASSWORD_RESET_EXPIRY_MINUTES = 60
const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL ?? 'http://localhost:5173'

function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return '***@***'
  const visible = local.length <= 2 ? local[0] : local.slice(0, 2)
  return `${visible}***@${domain}`
}

export const authRouter = Router()

authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const authLimit = checkAuthRateLimit(ip)
    if (!authLimit.allowed) {
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many attempts. Please try again later.',
        next_allowed_attempt_at: authLimit.nextAllowedAt ? new Date(authLimit.nextAllowedAt).toISOString() : undefined,
      })
    }

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

function setDeviceTokenCookie(res: Response, token: string) {
  const maxAge = 30 * 24 * 60 * 60
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(DEVICE_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: maxAge * 1000,
    path: '/',
  })
}

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const authLimit = checkAuthRateLimit(ip)
    if (!authLimit.allowed) {
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many attempts. Please try again later.',
        next_allowed_attempt_at: authLimit.nextAllowedAt ? new Date(authLimit.nextAllowedAt).toISOString() : undefined,
      })
    }

    const { email, password, rememberMe } = req.body
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
    } & { '2fa_enabled'?: number; '2fa_method'?: string | null; 'phone_number'?: string | null } | undefined

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' })
    }

    if (!user.email_verified) {
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email before logging in',
      })
    }

    const twofaEnabled = user['2fa_enabled'] === 1
    const twofaMethod = user['2fa_method'] as 'totp' | 'sms' | null

    if (twofaEnabled) {
      const deviceToken = req.cookies?.[DEVICE_TOKEN_COOKIE]
      if (deviceToken && validateDeviceToken(user.id, deviceToken)) {
        const accessToken = createAccessToken(user.id, user.email)
        const refreshToken = createRefreshToken()
        storeRefreshToken(user.id, refreshToken, ip, req.get('user-agent'))
        createSession(user.id, ip, req.get('user-agent'))
        setRefreshTokenCookie(res, refreshToken)
        return res.json({
          accessToken,
          sessionToken: accessToken,
          user: {
            id: user.id,
            email: user.email,
            email_verified: Boolean(user.email_verified),
            first_name: user.first_name,
            last_name: user.last_name,
          },
        })
      }
      const sessionTempToken = createSessionTempToken(user.id)
      return res.status(206).json({
        code: '2FA_REQUIRED',
        message: 'Two-factor authentication required',
        session_temp_token: sessionTempToken,
        twofa_methods: twofaMethod ? [twofaMethod] : ['totp', 'sms'],
        phone_masked: user.phone_number ? maskPhone(user.phone_number) : null,
      })
    }

    const accessToken = createAccessToken(user.id, user.email)
    const refreshToken = createRefreshToken()
    storeRefreshToken(user.id, refreshToken, ip, req.get('user-agent'))
    createSession(user.id, ip, req.get('user-agent'))
    setRefreshTokenCookie(res, refreshToken)

    return res.json({
      accessToken,
      sessionToken: accessToken, // backward compat
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

authRouter.post('/2fa/verify', async (req: Request, res: Response) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const { session_temp_token, code, method, remember_device } = req.body

    if (!session_temp_token || !code || !method) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'session_temp_token, code, and method are required',
      })
    }

    const session = validateSessionTempToken(session_temp_token)
    if (!session) {
      return res.status(401).json({
        code: 'SESSION_EXPIRED',
        message: 'Your session has expired. Please log in again.',
      })
    }

    const lockout = check2faVerifyLockout(session.userId, ip)
    if (!lockout.allowed) {
      return res.status(429).json({
        code: '2FA_LOCKOUT',
        message: 'Too many failed attempts. Please try again later.',
        next_allowed_at: lockout.nextAllowedAt?.toISOString(),
      })
    }

    const validMethod = ['totp', 'sms', 'recovery'].includes(method)
    if (!validMethod) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid method' })
    }

    const verified =
      (method === 'totp' && (await verify2faForUser(session.userId, code, 'totp'))) ||
      (method === 'sms' && (await verify2faForUser(session.userId, code, 'sms'))) ||
      (method === 'recovery' && (await verifyRecoveryCode(session.userId, code)))

    if (!verified) {
      record2faVerifyAttempt(session.userId, ip)
      return res.status(401).json({
        code: 'INVALID_2FA_CODE',
        message: 'Invalid or expired code. Please try again.',
      })
    }

    clear2faVerifyAttempts(session.userId, ip)
    consumeSessionTempToken(session_temp_token)

    const user = db.prepare(
      'SELECT id, email, first_name, last_name FROM users WHERE id = ?'
    ).get(session.userId) as { id: string; email: string; first_name: string; last_name: string }

    const accessToken = createAccessToken(user.id, user.email)
    const refreshToken = createRefreshToken()
    storeRefreshToken(user.id, refreshToken, ip, req.get('user-agent'))
    createSession(user.id, ip, req.get('user-agent'))
    setRefreshTokenCookie(res, refreshToken)

    if (remember_device) {
      const deviceFingerprint = `${ip}-${req.get('user-agent') ?? 'unknown'}`
      const deviceToken = createDeviceToken(user.id, deviceFingerprint)
      setDeviceTokenCookie(res, deviceToken)
    }

    logAudit(user.id, '2fa.verified', { method }, ip)

    return res.json({
      accessToken,
      sessionToken: accessToken,
      user: {
        id: user.id,
        email: user.email,
        email_verified: true,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    })
  } catch (err) {
    console.error('[Auth] 2FA verify error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

authRouter.post('/2fa/send-sms', async (req: Request, res: Response) => {
  try {
    const { session_temp_token, phone_number, purpose } = req.body

    if (!purpose) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'purpose is required',
      })
    }

    let userId: string | null = null
    if (session_temp_token) {
      const session = validateSessionTempToken(session_temp_token)
      if (session) userId = session.userId
    }
    if (!userId && purpose === 'enable') {
      userId = getUserIdFromAccessToken(req)
    }

    let phone = phone_number
    if (!phone && purpose === 'login' && userId) {
      const user = db.prepare('SELECT phone_number FROM users WHERE id = ?').get(userId) as { phone_number: string | null } | undefined
      phone = user?.phone_number ?? null
    }
    if (!phone) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: purpose === 'login' ? 'SMS 2FA is not configured for this account' : 'phone_number is required',
      })
    }

    const result = await sendSMSOTP(userId, phone, purpose)
    if (!result.sent) {
      return res.status(429).json({
        code: 'SMS_COOLDOWN',
        message: 'Please wait before requesting another code.',
        cooldown_seconds: result.cooldownSeconds,
      })
    }

    return res.json({
      sent: true,
      cooldown_seconds: result.cooldownSeconds,
    })
  } catch (err) {
    console.error('[Auth] 2FA send SMS error:', err)
    const msg = err instanceof Error ? err.message : 'Invalid phone number'
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: msg })
  }
})

function requireAuth(req: Request, res: Response, next: () => void) {
  const userId = getUserIdFromAccessToken(req)
  if (!userId) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }
  ;(req as Request & { userId: string }).userId = userId
  next()
}

authRouter.post('/2fa/totp/setup', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const status = get2faStatus(userId)
    if (status.enabled) {
      return res.status(400).json({ code: '2FA_ALREADY_ENABLED', message: '2FA is already enabled' })
    }
    const user = db.prepare('SELECT email FROM users WHERE id = ?').get(userId) as { email: string }
    const { secret, otpauthUri, qrDataUri } = await setupTOTP(userId, user.email)
    return res.json({ otpauth_uri: otpauthUri, secret, qr_data_uri: qrDataUri })
  } catch (err) {
    console.error('[Auth] 2FA TOTP setup error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

authRouter.post('/2fa/enable', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const { method, verification_code, phone_number, password } = req.body

    if (!method || !verification_code || !password) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'method, verification_code, and password are required',
      })
    }

    const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(userId) as {
      password_hash: string | null
    }
    if (!user?.password_hash || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ code: 'INVALID_PASSWORD', message: 'Invalid password' })
    }

    if (method === 'totp') {
      const { recoveryCodes } = await enableTOTP(userId, verification_code)
      logAudit(userId, '2fa.enabled', { method: 'totp' }, ip)
      return res.json({ enabled: true, recovery_codes: recoveryCodes })
    }

    if (method === 'sms') {
      if (!phone_number) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'phone_number required for SMS' })
      }
      if (!isValidPhone(phone_number)) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid phone number' })
      }
      const normalized = normalizePhone(phone_number)
      const { recoveryCodes } = await enableSMS(userId, normalized, verification_code)
      logAudit(userId, '2fa.enabled', { method: 'sms' }, ip)
      return res.json({ enabled: true, recovery_codes: recoveryCodes })
    }

    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid method' })
  } catch (err) {
    console.error('[Auth] 2FA enable error:', err)
    const msg = err instanceof Error ? err.message : 'An error occurred'
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: msg })
  }
})

authRouter.post('/2fa/disable', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
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

    await disable2FA(userId, password, code, user.password_hash)
    logAudit(userId, '2fa.disabled', {}, ip)
    return res.json({ disabled: true })
  } catch (err) {
    console.error('[Auth] 2FA disable error:', err)
    const msg = err instanceof Error ? err.message : 'An error occurred'
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: msg })
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

    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const accessToken = createAccessToken(user.id, user.email)
    const refreshToken = createRefreshToken()
    storeRefreshToken(user.id, refreshToken, ip, req.get('user-agent'))
    createSession(user.id, ip, req.get('user-agent'))
    setRefreshTokenCookie(res, refreshToken)

    return res.json({
      status: 'verified',
      user: {
        id: user.id,
        email: user.email,
        email_verified: true,
        first_name: user.first_name,
        last_name: user.last_name,
      },
      accessToken,
      sessionToken: accessToken,
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

authRouter.post('/refresh', (req: Request, res: Response) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req)
    if (!refreshToken) {
      return res.status(401).json({ code: 'NO_REFRESH_TOKEN', message: 'Refresh token required' })
    }
    const result = validateRefreshToken(refreshToken)
    if (!result) {
      clearRefreshTokenCookie(res)
      return res.status(401).json({ code: 'INVALID_REFRESH_TOKEN', message: 'Invalid or expired refresh token' })
    }
    const user = db.prepare('SELECT id, email, first_name, last_name FROM users WHERE id = ?').get(result.userId) as {
      id: string
      email: string
      first_name: string
      last_name: string
    } | undefined
    if (!user) {
      clearRefreshTokenCookie(res)
      return res.status(401).json({ code: 'USER_NOT_FOUND', message: 'User not found' })
    }
    revokeRefreshToken(refreshToken)
    const newRefreshToken = createRefreshToken()
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    storeRefreshToken(user.id, newRefreshToken, ip, req.get('user-agent'))
    setRefreshTokenCookie(res, newRefreshToken)
    const accessToken = createAccessToken(user.id, user.email)
    return res.json({
      accessToken,
      sessionToken: accessToken,
      user: {
        id: user.id,
        email: user.email,
        email_verified: true,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    })
  } catch (err) {
    console.error('[Auth] Refresh error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

authRouter.post('/logout', (req: Request, res: Response) => {
  try {
    const refreshToken = getRefreshTokenFromRequest(req)
    if (refreshToken) {
      revokeRefreshToken(refreshToken)
    }
    clearRefreshTokenCookie(res)
    return res.json({ message: 'Logged out' })
  } catch (err) {
    console.error('[Auth] Logout error:', err)
    clearRefreshTokenCookie(res)
    return res.json({ message: 'Logged out' })
  }
})

authRouter.post('/password-reset/request', async (req: Request, res: Response) => {
  try {
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const authLimit = checkAuthRateLimit(ip)
    if (!authLimit.allowed) {
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many attempts. Please try again later.',
      })
    }
    const { email } = req.body
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Email is required' })
    }
    const normalizedEmail = email.trim().toLowerCase()
    const user = db.prepare('SELECT id, first_name, email, password_hash FROM users WHERE email = ?').get(
      normalizedEmail
    ) as { id: string; first_name: string; email: string; password_hash: string | null } | undefined
    if (!user) {
      return res.json({ message: 'If an account exists with this email, a reset link has been sent.' })
    }
    if (!user.password_hash) {
      return res.json({ message: 'If an account exists with this email, a reset link has been sent.' })
    }
    const token = crypto.randomBytes(48).toString('hex')
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000)
    db.prepare(
      `INSERT INTO password_reset_tokens (id, user_id, token_hash, expires_at)
       VALUES (?, ?, ?, ?)`
    ).run(crypto.randomUUID(), user.id, tokenHash, expiresAt.toISOString())
    const resetUrl = `${VERIFY_BASE_URL}/password-reset/confirm?token=${token}`
    const sent = await sendPasswordResetEmail({
      firstName: user.first_name,
      email: user.email,
      resetUrl,
      expiresAt,
    })
    if (!sent) {
      return res.status(503).json({
        code: 'EMAIL_DELIVERY_FAILED',
        message: 'We could not send the reset email. Please try again later.',
      })
    }
    return res.json({ message: 'If an account exists with this email, a reset link has been sent.' })
  } catch (err) {
    console.error('[Auth] Password reset request error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

authRouter.post('/password-reset/confirm', async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body
    if (!token || !newPassword) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Token and new password are required' })
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{10,}$/
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Password must be at least 10 characters with uppercase, lowercase, digit, and special character',
      })
    }
    const tokenHash = hashToken(token)
    const row = db.prepare(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > datetime('now')`
    ).get(tokenHash) as { id: string; user_id: string } | undefined
    if (!row) {
      return res.status(400).json({ code: 'TOKEN_INVALID', message: 'Invalid or expired reset link' })
    }
    const passwordHash = await bcrypt.hash(newPassword, 10)
    db.prepare("UPDATE password_reset_tokens SET used_at = datetime('now') WHERE id = ?").run(row.id)
    db.prepare('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?').run(passwordHash, row.user_id)
    const user = db.prepare('SELECT id, email, first_name, last_name FROM users WHERE id = ?').get(row.user_id) as {
      id: string
      email: string
      first_name: string
      last_name: string
    }
    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const accessToken = createAccessToken(user.id, user.email)
    const refreshToken = createRefreshToken()
    storeRefreshToken(user.id, refreshToken, ip, req.get('user-agent'))
    createSession(user.id, ip, req.get('user-agent'))
    setRefreshTokenCookie(res, refreshToken)
    return res.json({
      message: 'Password reset successfully',
      accessToken,
      sessionToken: accessToken,
      user: {
        id: user.id,
        email: user.email,
        email_verified: true,
        first_name: user.first_name,
        last_name: user.last_name,
      },
    })
  } catch (err) {
    console.error('[Auth] Password reset confirm error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'An error occurred' })
  }
})

// OAuth routes are handled by oauth.ts router at /api/auth/oauth
