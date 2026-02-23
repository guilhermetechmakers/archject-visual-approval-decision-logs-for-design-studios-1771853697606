import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { Request } from 'express'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const HMAC_SECRET = process.env.HMAC_SECRET ?? 'archject-verification-salt'
const REFRESH_TOKEN_DAYS = 14
const ACCESS_TOKEN_MINUTES = 15
const REFRESH_TOKEN_COOKIE = 'archject_refresh'

export interface JwtPayload {
  sub: string
  email: string
  roles?: string[]
  tokenVersion?: number
}

export function hashToken(token: string): string {
  return crypto.createHmac('sha256', HMAC_SECRET).update(token).digest('hex')
}

export function createAccessToken(userId: string, email: string): string {
  return jwt.sign(
    { sub: userId, email } as JwtPayload,
    JWT_SECRET,
    { expiresIn: `${ACCESS_TOKEN_MINUTES}m` }
  )
}

export function verifyAccessToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload
    return decoded
  } catch {
    return null
  }
}

export function createRefreshToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function setRefreshTokenCookie(res: { cookie: (name: string, value: string, options: object) => void }, token: string) {
  const maxAge = REFRESH_TOKEN_DAYS * 24 * 60 * 60
  const isProd = process.env.NODE_ENV === 'production'
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    maxAge: maxAge * 1000,
    path: '/',
  })
}

export function clearRefreshTokenCookie(res: { clearCookie: (name: string, options?: object) => void }) {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
  })
}

export function getRefreshTokenFromRequest(req: Request): string | null {
  return req.cookies?.[REFRESH_TOKEN_COOKIE] ?? null
}

export function storeRefreshToken(
  userId: string,
  token: string,
  ip: string | undefined,
  userAgent: string | undefined
): string {
  const id = crypto.randomUUID()
  const tokenHash = hashToken(token)
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

  db.prepare(
    `INSERT INTO refresh_tokens (id, user_id, token_hash, ip, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(id, userId, tokenHash, ip ?? null, userAgent ?? null, expiresAt.toISOString())

  return id
}

export function validateRefreshToken(token: string): { userId: string } | null {
  const tokenHash = hashToken(token)
  const row = db.prepare(
    `SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > datetime('now')`
  ).get(tokenHash) as { id: string; user_id: string } | undefined

  if (!row) return null
  return { userId: row.user_id }
}

export function revokeRefreshToken(token: string): void {
  const tokenHash = hashToken(token)
  db.prepare(
    `UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE token_hash = ?`
  ).run(tokenHash)
}

export function revokeAllRefreshTokensForUser(userId: string): void {
  db.prepare(
    `UPDATE refresh_tokens SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`
  ).run(userId)
}

export function revokeAllSessionsForUser(userId: string): void {
  db.prepare(
    `UPDATE sessions SET revoked_at = datetime('now') WHERE user_id = ? AND revoked_at IS NULL`
  ).run(userId)
}

export function createSession(userId: string, ip: string | undefined, userAgent: string | undefined): string {
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO sessions (id, user_id, ip, user_agent) VALUES (?, ?, ?, ?)`
  ).run(id, userId, ip ?? null, userAgent ?? null)
  return id
}

export function updateSessionLastActive(sessionId: string): void {
  db.prepare(
    `UPDATE sessions SET last_active_at = datetime('now') WHERE id = ?`
  ).run(sessionId)
}

export function getUserIdFromAccessToken(req: Request): string | null {
  const authHeader = req.get('Authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) return null
  const payload = verifyAccessToken(token)
  return payload?.sub ?? null
}
