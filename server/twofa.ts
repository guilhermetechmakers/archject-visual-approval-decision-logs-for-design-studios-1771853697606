import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { generateSecret, generateURI, verify as otplibVerify } from 'otplib'
import QRCode from 'qrcode'
import { parsePhoneNumber, isValidPhoneNumber } from 'libphonenumber-js'
import { db } from './db.js'
import { hashToken } from './auth-utils.js'

const ENCRYPTION_KEY = process.env.TWOFA_ENCRYPTION_KEY ?? 'dev-2fa-encryption-key-32bytes!!'
const OTP_EXPIRY_MINUTES = 10
const SESSION_TEMP_EXPIRY_MINUTES = 15
const DEVICE_TOKEN_DAYS = 30
const MAX_VERIFY_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15
const SMS_COOLDOWN_SECONDS = 60
const RECOVERY_CODE_COUNT = 10

export type TwoFAMethod = 'totp' | 'sms'

function getEncryptionKey(): Buffer {
  const key = ENCRYPTION_KEY.slice(0, 32).padEnd(32, '0')
  return Buffer.from(key, 'utf8')
}

function encrypt(plain: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

function decrypt(encrypted: string): string {
  const [ivHex, dataHex] = encrypted.split(':')
  if (!ivHex || !dataHex) throw new Error('Invalid encrypted format')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), iv)
  return decipher.update(dataHex, 'hex', 'utf8') + decipher.final('utf8')
}

export function generateTOTPSecret(): string {
  return generateSecret()
}

export function getTOTPAuthUri(secret: string, email: string): string {
  return generateURI({ issuer: 'Archject', label: email, secret })
}

export async function generateQRDataUri(otpauthUri: string): Promise<string> {
  return QRCode.toDataURL(otpauthUri, { width: 200, margin: 2 })
}

export async function verifyTOTP(secret: string, token: string): Promise<boolean> {
  try {
    const result = await otplibVerify({ token: token.replace(/\s/g, ''), secret })
    return result.valid
  } catch {
    return false
  }
}

export function normalizePhone(phone: string): string {
  const parsed = parsePhoneNumber(phone, 'US') ?? parsePhoneNumber(phone)
  if (!parsed) throw new Error('Invalid phone number')
  return parsed.format('E.164')
}

export function isValidPhone(phone: string): boolean {
  try {
    return isValidPhoneNumber(phone)
  } catch {
    return false
  }
}

export function maskPhone(phone: string): string {
  if (!phone || phone.length < 6) return '+***'
  return phone.slice(0, 3) + '***' + phone.slice(-2)
}

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString()
}

function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 12; i++) {
    code += chars[crypto.randomInt(0, chars.length)]
  }
  return code
}

export async function sendSMS(phone: string, otp: string): Promise<boolean> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER

  if (!accountSid || !authToken || !fromNumber) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[2FA] Twilio not configured - cannot send SMS')
      return false
    }
    console.log(`[2FA] Mock SMS to ${phone}: Archject verification code: ${otp} — Expires in ${OTP_EXPIRY_MINUTES} minutes.`)
    return true
  }

  try {
    const twilio = (await import('twilio')).default
    const client = twilio(accountSid, authToken)
    await client.messages.create({
      body: `Archject verification code: ${otp} — Expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      from: fromNumber,
      to: phone,
    })
    return true
  } catch (err) {
    console.error('[2FA] Twilio SMS error:', err)
    return false
  }
}

export function createSessionTempToken(userId: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_TEMP_EXPIRY_MINUTES * 60 * 1000)
  db.prepare(
    `INSERT INTO session_temp_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  ).run(id, userId, tokenHash, expiresAt.toISOString())
  return token
}

export function validateSessionTempToken(token: string): { userId: string } | null {
  const tokenHash = hashToken(token)
  const row = db.prepare(
    `SELECT user_id FROM session_temp_tokens WHERE token_hash = ? AND expires_at > datetime('now')`
  ).get(tokenHash) as { user_id: string } | undefined
  if (!row) return null
  return { userId: row.user_id }
}

export function consumeSessionTempToken(token: string): void {
  const tokenHash = hashToken(token)
  db.prepare('DELETE FROM session_temp_tokens WHERE token_hash = ?').run(tokenHash)
}

export function createDeviceToken(userId: string, deviceFingerprint: string): string {
  const token = crypto.randomBytes(32).toString('hex')
  const tokenHash = hashToken(token)
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + DEVICE_TOKEN_DAYS * 24 * 60 * 60 * 1000)
  db.prepare(
    `INSERT INTO device_tokens (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)`
  ).run(id, userId, tokenHash, expiresAt.toISOString())
  return token
}

export function validateDeviceToken(userId: string, token: string): boolean {
  const tokenHash = hashToken(token)
  const row = db.prepare(
    `SELECT id FROM device_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > datetime('now')`
  ).get(userId, tokenHash) as { id: string } | undefined
  if (!row) return false
  db.prepare('UPDATE device_tokens SET last_used_at = datetime("now") WHERE id = ?').run(row.id)
  return true
}

export function logAudit(userId: string | null, event: string, meta: Record<string, unknown>, ip?: string): void {
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO audit_logs (id, user_id, action, meta, ip) VALUES (?, ?, ?, ?, ?)`
  ).run(id, userId, event, JSON.stringify(meta), ip ?? null)
}

export function check2faVerifyLockout(userId: string, ip: string): { allowed: boolean; nextAllowedAt?: Date } {
  const recent = db.prepare(
    `SELECT COUNT(*) as cnt FROM twofa_verify_attempts
     WHERE (user_id = ? OR ip = ?) AND created_at > datetime('now', ?)`
  ).get(userId, ip, `-${LOCKOUT_MINUTES} minutes`) as { cnt: number }
  if (recent.cnt >= MAX_VERIFY_ATTEMPTS) {
    const oldest = db.prepare(
      `SELECT created_at FROM twofa_verify_attempts
       WHERE (user_id = ? OR ip = ?) ORDER BY created_at ASC LIMIT 1`
    ).get(userId, ip) as { created_at: string } | undefined
    if (oldest) {
      const nextAllowed = new Date(new Date(oldest.created_at).getTime() + LOCKOUT_MINUTES * 60 * 1000)
      return { allowed: false, nextAllowedAt: nextAllowed }
    }
  }
  return { allowed: true }
}

export function record2faVerifyAttempt(userId: string, ip: string): void {
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO twofa_verify_attempts (id, user_id, ip) VALUES (?, ?, ?)`
  ).run(id, userId, ip)
}

export function clear2faVerifyAttempts(userId: string, ip: string): void {
  db.prepare('DELETE FROM twofa_verify_attempts WHERE user_id = ? OR ip = ?').run(userId, ip)
}

export async function setupTOTP(userId: string, email: string): Promise<{ secret: string; otpauthUri: string; qrDataUri: string }> {
  const secret = generateTOTPSecret()
  const otpauthUri = getTOTPAuthUri(secret, email)
  const qrDataUri = await generateQRDataUri(otpauthUri)
  const encrypted = encrypt(secret)
  const id = crypto.randomUUID()
  db.prepare(
    `INSERT INTO totp_secrets (id, user_id, secret_encrypted, created_at) VALUES (?, ?, ?, datetime('now'))`
  ).run(id, userId, encrypted)
  return { secret, otpauthUri, qrDataUri }
}

export async function enableTOTP(userId: string, verificationCode: string): Promise<{ recoveryCodes: string[] }> {
  const row = db.prepare(
    `SELECT id, secret_encrypted FROM totp_secrets WHERE user_id = ? AND enabled_at IS NULL ORDER BY created_at DESC LIMIT 1`
  ).get(userId) as { id: string; secret_encrypted: string } | undefined
  if (!row) throw new Error('TOTP setup not found. Please start the setup again.')
  const secret = decrypt(row.secret_encrypted)
  if (!(await verifyTOTP(secret, verificationCode))) throw new Error('Invalid verification code')
  db.prepare('UPDATE totp_secrets SET enabled_at = datetime("now") WHERE id = ?').run(row.id)
  db.prepare('DELETE FROM totp_secrets WHERE user_id = ? AND id != ?').run(userId, row.id)
  db.prepare(
    `UPDATE users SET 2fa_enabled = 1, 2fa_method = 'totp', phone_number = NULL, 2fa_recovery_generated_at = datetime('now') WHERE id = ?`
  ).run(userId)
  const recoveryCodes = await generateAndStoreRecoveryCodes(userId)
  return { recoveryCodes }
}

export async function sendSMSOTP(userId: string | null, phone: string, purpose: 'enable' | 'login'): Promise<{ sent: boolean; cooldownSeconds?: number }> {
  const normalized = normalizePhone(phone)
  const recent = db.prepare(
    `SELECT created_at FROM sms_otps WHERE phone_number = ? AND created_at > datetime('now', '-10 minutes') ORDER BY created_at DESC LIMIT 1`
  ).get(normalized) as { created_at: string } | undefined
  if (recent) {
    const elapsed = (Date.now() - new Date(recent.created_at).getTime()) / 1000
    if (elapsed < SMS_COOLDOWN_SECONDS) {
      return { sent: false, cooldownSeconds: Math.ceil(SMS_COOLDOWN_SECONDS - elapsed) }
    }
  }
  const otp = generateOTP()
  const otpHash = await bcrypt.hash(otp, 10)
  const id = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)
  db.prepare(
    `INSERT INTO sms_otps (id, user_id, phone_number, otp_hash, expires_at, attempts_remaining, status) VALUES (?, ?, ?, ?, ?, 5, 'pending')`
  ).run(id, userId, normalized, otpHash, expiresAt.toISOString())
  const sent = await sendSMS(normalized, otp)
  db.prepare('UPDATE sms_otps SET status = ? WHERE id = ?').run(sent ? 'sent' : 'failed', id)
  return { sent, cooldownSeconds: SMS_COOLDOWN_SECONDS }
}

export async function verifySMSOTP(userId: string | null, phone: string, code: string): Promise<boolean> {
  const normalized = normalizePhone(phone)
  const row = db.prepare(
    `SELECT id, otp_hash, expires_at, attempts_remaining FROM sms_otps
     WHERE phone_number = ? AND (user_id = ? OR user_id IS NULL) AND status = 'sent'
     ORDER BY created_at DESC LIMIT 1`
  ).get(normalized, userId) as { id: string; otp_hash: string; expires_at: string; attempts_remaining: number } | undefined
  if (!row) return false
  if (new Date(row.expires_at) < new Date()) return false
  if (row.attempts_remaining <= 0) return false
  const valid = await bcrypt.compare(code, row.otp_hash)
  if (!valid) {
    db.prepare('UPDATE sms_otps SET attempts_remaining = attempts_remaining - 1 WHERE id = ?').run(row.id)
    return false
  }
  db.prepare('DELETE FROM sms_otps WHERE id = ?').run(row.id)
  return true
}

export async function enableSMS(userId: string, phone: string, verificationCode: string): Promise<{ recoveryCodes: string[] }> {
  const valid = await verifySMSOTP(userId, phone, verificationCode)
  if (!valid) throw new Error('Invalid or expired verification code')
  db.prepare(
    `UPDATE users SET 2fa_enabled = 1, 2fa_method = 'sms', phone_number = ?, 2fa_recovery_generated_at = datetime('now') WHERE id = ?`
  ).run(phone, userId)
  db.prepare('DELETE FROM totp_secrets WHERE user_id = ?').run(userId)
  const recoveryCodes = await generateAndStoreRecoveryCodes(userId)
  return { recoveryCodes }
}

async function generateAndStoreRecoveryCodes(userId: string): Promise<string[]> {
  db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(userId)
  const codes: string[] = []
  for (let i = 0; i < RECOVERY_CODE_COUNT; i++) {
    const code = generateRecoveryCode()
    const codeHash = await bcrypt.hash(code, 10)
    const id = crypto.randomUUID()
    db.prepare(
      `INSERT INTO recovery_codes (id, user_id, code_hash) VALUES (?, ?, ?)`
    ).run(id, userId, codeHash)
    codes.push(code)
  }
  return codes
}

export async function verifyRecoveryCode(userId: string, code: string): Promise<boolean> {
  const normalized = code.replace(/\s/g, '').toUpperCase()
  const rows = db.prepare(
    `SELECT id, code_hash FROM recovery_codes WHERE user_id = ? AND used_at IS NULL`
  ).all(userId) as { id: string; code_hash: string }[]
  for (const row of rows) {
    const valid = await bcrypt.compare(normalized, row.code_hash)
    if (valid) {
      db.prepare('UPDATE recovery_codes SET used_at = datetime("now") WHERE id = ?').run(row.id)
      return true
    }
  }
  return false
}

export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  return generateAndStoreRecoveryCodes(userId)
}

export function get2faStatus(userId: string): {
  enabled: boolean
  method: TwoFAMethod | null
  phoneMasked: string | null
  lastEnforcedByAdmin?: boolean
} {
  const user = db.prepare(
    `SELECT 2fa_enabled, 2fa_method, phone_number FROM users WHERE id = ?`
  ).get(userId) as { '2fa_enabled': number; '2fa_method': string | null; 'phone_number': string | null } | undefined
  if (!user) return { enabled: false, method: null, phoneMasked: null }
  return {
    enabled: !!user['2fa_enabled'],
    method: user['2fa_method'] as TwoFAMethod | null,
    phoneMasked: user.phone_number ? maskPhone(user.phone_number) : null,
  }
}

export async function verify2faForUser(userId: string, code: string, method: 'totp' | 'sms' | 'recovery'): Promise<boolean> {
  const status = get2faStatus(userId)
  if (!status.enabled) return false
  if (method === 'totp') {
    const row = db.prepare(
      `SELECT secret_encrypted FROM totp_secrets WHERE user_id = ? AND enabled_at IS NOT NULL`
    ).get(userId) as { secret_encrypted: string } | undefined
    if (!row) return false
    const secret = decrypt(row.secret_encrypted)
    return await verifyTOTP(secret, code)
  }
  if (method === 'sms') {
    const user = db.prepare('SELECT phone_number FROM users WHERE id = ?').get(userId) as { phone_number: string } | undefined
    if (!user?.phone_number) return false
    return verifySMSOTP(userId, user.phone_number, code)
  }
  if (method === 'recovery') {
    return verifyRecoveryCode(userId, code)
  }
  return false
}

export async function disable2FA(userId: string, password: string, code: string, passwordHash: string): Promise<void> {
  const valid = await bcrypt.compare(password, passwordHash)
  if (!valid) throw new Error('Invalid password')
  const verified = await verify2faForUser(userId, code, 'totp') ||
    await verify2faForUser(userId, code, 'sms') ||
    await verifyRecoveryCode(userId, code)
  if (!verified) throw new Error('Invalid 2FA code')
  db.prepare('DELETE FROM totp_secrets WHERE user_id = ?').run(userId)
  db.prepare('DELETE FROM recovery_codes WHERE user_id = ?').run(userId)
  db.prepare(
    `UPDATE users SET 2fa_enabled = 0, 2fa_method = NULL, phone_number = NULL, 2fa_recovery_generated_at = NULL WHERE id = ?`
  ).run(userId)
}

export function getUserPhone(userId: string): string | null {
  const row = db.prepare('SELECT phone_number FROM users WHERE id = ?').get(userId) as { phone_number: string | null } | undefined
  return row?.phone_number ?? null
}
