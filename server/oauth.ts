import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { db } from './db.js'
import {
  createAccessToken,
  createRefreshToken,
  storeRefreshToken,
  setRefreshTokenCookie,
} from './auth-utils.js'
import { createSession } from './auth-utils.js'

const OAUTH_STATE_COOKIE = 'archject_oauth_state'
const FRONTEND_BASE = process.env.VERIFY_BASE_URL ?? 'http://localhost:5173'

const API_BASE = process.env.API_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`
const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? ''
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_OAUTH_REDIRECT_URI ?? `${API_BASE}/api/auth/oauth/google/callback`

export const oauthRouter = Router()

oauthRouter.get('/google', (req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    return res.redirect(`${FRONTEND_BASE}/auth?error=oauth_not_configured`)
  }
  const state = crypto.randomBytes(24).toString('hex')
  const redirect = (req.query.redirect as string) ?? '/dashboard'
  res.cookie(OAUTH_STATE_COOKIE, JSON.stringify({ state, redirect }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10 * 60 * 1000,
    path: '/',
  })
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
  })
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`)
})

oauthRouter.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const cookie = req.cookies?.[OAUTH_STATE_COOKIE]
    if (!cookie) {
      return res.redirect(`${FRONTEND_BASE}/auth?error=invalid_state`)
    }
    let stateData: { state: string; redirect: string }
    try {
      stateData = JSON.parse(cookie)
    } catch {
      return res.redirect(`${FRONTEND_BASE}/auth?error=invalid_state`)
    }
    res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' })

    const { code, state } = req.query
    if (!code || typeof code !== 'string' || state !== stateData.state) {
      return res.redirect(`${FRONTEND_BASE}/auth?error=invalid_state`)
    }

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${FRONTEND_BASE}/auth?error=oauth_not_configured`)
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[OAuth] Google token exchange failed:', err)
      return res.redirect(`${FRONTEND_BASE}/auth?error=oauth_failed`)
    }

    const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string }
    if (!tokens.id_token) {
      return res.redirect(`${FRONTEND_BASE}/auth?error=oauth_failed`)
    }

    const parts = tokens.id_token.split('.')
    if (parts.length !== 3) {
      return res.redirect(`${FRONTEND_BASE}/auth?error=oauth_failed`)
    }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as {
      sub: string
      email?: string
      email_verified?: boolean
      name?: string
      given_name?: string
      family_name?: string
    }

    const providerUserId = payload.sub
    const email = (payload.email ?? '').toLowerCase().trim()
    if (!email) {
      return res.redirect(`${FRONTEND_BASE}/auth?error=oauth_no_email`)
    }

    const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown'
    const userAgent = req.get('user-agent')

    const existingOAuth = db.prepare(
      'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_user_id = ?'
    ).get('google', providerUserId) as { user_id: string } | undefined

    if (existingOAuth) {
      const user = db.prepare('SELECT id, email, first_name, last_name FROM users WHERE id = ?').get(existingOAuth.user_id) as {
        id: string
        email: string
        first_name: string
        last_name: string
      }
      db.prepare("UPDATE oauth_accounts SET last_used_at = datetime('now') WHERE provider = ? AND provider_user_id = ?").run('google', providerUserId)

      const accessToken = createAccessToken(user.id, user.email)
      const refreshToken = createRefreshToken()
      storeRefreshToken(user.id, refreshToken, ip, userAgent)
      createSession(user.id, ip, userAgent)
      setRefreshTokenCookie(res, refreshToken)

      const redirect = stateData.redirect || '/dashboard'
      const userParam = encodeURIComponent(JSON.stringify({ id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name }))
      return res.redirect(`${FRONTEND_BASE}/auth/oauth-callback?token=${accessToken}&user=${userParam}&redirect=${encodeURIComponent(redirect)}`)
    }

    const existingUser = db.prepare('SELECT id, email, first_name, last_name FROM users WHERE email = ?').get(email) as {
      id: string
      email: string
      first_name: string
      last_name: string
    } | undefined

    if (existingUser) {
      db.prepare(
        `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email)
         VALUES (?, ?, 'google', ?, ?)`
      ).run(crypto.randomUUID(), existingUser.id, providerUserId, email)

      const accessToken = createAccessToken(existingUser.id, existingUser.email)
      const refreshToken = createRefreshToken()
      storeRefreshToken(existingUser.id, refreshToken, ip, userAgent)
      createSession(existingUser.id, ip, userAgent)
      setRefreshTokenCookie(res, refreshToken)

      const redirect = stateData.redirect || '/dashboard'
      const userParam = encodeURIComponent(JSON.stringify({ id: existingUser.id, email: existingUser.email, first_name: existingUser.first_name, last_name: existingUser.last_name }))
      return res.redirect(`${FRONTEND_BASE}/auth/oauth-callback?token=${accessToken}&user=${userParam}&redirect=${encodeURIComponent(redirect)}`)
    }

    const userId = crypto.randomUUID()
    const firstName = payload.given_name ?? payload.name?.split(' ')[0] ?? 'User'
    const lastName = payload.family_name ?? payload.name?.split(' ').slice(1).join(' ') ?? ''

    db.prepare(
      `INSERT INTO users (id, first_name, last_name, email, email_verified, password_hash, company)
       VALUES (?, ?, ?, ?, 1, NULL, NULL)`
    ).run(userId, firstName, lastName, email)

    db.prepare(
      `INSERT INTO oauth_accounts (id, user_id, provider, provider_user_id, provider_email)
       VALUES (?, ?, 'google', ?, ?)`
    ).run(crypto.randomUUID(), userId, providerUserId, email)

    const accessToken = createAccessToken(userId, email)
    const refreshToken = createRefreshToken()
    storeRefreshToken(userId, refreshToken, ip, userAgent)
    createSession(userId, ip, userAgent)
    setRefreshTokenCookie(res, refreshToken)

    const redirect = stateData.redirect || '/dashboard'
    const userParam = encodeURIComponent(JSON.stringify({ id: userId, email, first_name: firstName, last_name: lastName }))
    return res.redirect(`${FRONTEND_BASE}/auth/oauth-callback?token=${accessToken}&user=${userParam}&redirect=${encodeURIComponent(redirect)}`)
  } catch (err) {
    console.error('[OAuth] Google callback error:', err)
    return res.redirect(`${FRONTEND_BASE}/auth?error=oauth_failed`)
  }
})

oauthRouter.get('/apple', (_req: Request, res: Response) => {
  res.redirect(`${FRONTEND_BASE}/auth?error=oauth_coming_soon&provider=apple`)
})

oauthRouter.get('/apple/callback', (_req: Request, res: Response) => {
  res.redirect(`${FRONTEND_BASE}/auth?error=oauth_coming_soon&provider=apple`)
})

oauthRouter.get('/microsoft', (_req: Request, res: Response) => {
  res.redirect(`${FRONTEND_BASE}/auth?error=oauth_coming_soon&provider=microsoft`)
})

oauthRouter.get('/microsoft/callback', (_req: Request, res: Response) => {
  res.redirect(`${FRONTEND_BASE}/auth?error=oauth_coming_soon&provider=microsoft`)
})
