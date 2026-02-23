import sgMail from '@sendgrid/mail'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? ''
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@archject.com'
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@archject.com'
const APP_NAME = 'Archject'
const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL ?? 'http://localhost:5173'

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY)
}

export interface VerificationEmailParams {
  firstName: string
  email: string
  verificationUrl: string
  expiresAt: Date
  studioName?: string
}

export async function sendVerificationEmail(params: VerificationEmailParams): Promise<boolean> {
  const { firstName, verificationUrl, expiresAt, studioName } = params
  const expiryHours = Math.round((expiresAt.getTime() - Date.now()) / (60 * 60 * 1000))

  const dynamicTemplateData = {
    first_name: firstName,
    studio_name: studioName ?? 'your studio',
    verification_url: verificationUrl,
    expiry_hours: String(expiryHours),
    support_email: SUPPORT_EMAIL,
  }

  const templateId = process.env.SENDGRID_VERIFICATION_TEMPLATE_ID

  if (!SENDGRID_API_KEY) {
    console.warn('[Mailer] SENDGRID_API_KEY not set. Verification email would be sent to:', params.email)
    console.warn('[Mailer] Verification URL:', verificationUrl)
    return true
  }

  try {
    if (templateId) {
      await sgMail.send({
        to: params.email,
        from: { email: FROM_EMAIL, name: APP_NAME },
        templateId,
        dynamicTemplateData,
        categories: ['verification-email'],
      })
    } else {
      const html = `
        <h1>Verify your email</h1>
        <p>Hi ${firstName},</p>
        <p>Click the link below to verify your email and activate your Archject account:</p>
        <p><a href="${verificationUrl}">Verify your email</a></p>
        <p>This link expires in ${dynamicTemplateData.expiry_hours} hours.</p>
        <p>If you didn't create an account, you can ignore this email.</p>
        <p>— ${APP_NAME}</p>
      `
      await sgMail.send({
        to: params.email,
        from: { email: FROM_EMAIL, name: APP_NAME },
        subject: 'Verify your Archject account',
        html,
        categories: ['verification-email'],
      })
    }
    return true
  } catch (err) {
    console.error('[Mailer] SendGrid error:', err)
    return false
  }
}

export interface PasswordResetEmailParams {
  firstName: string
  email: string
  resetUrl: string
  expiresAt: Date
}

export async function sendPasswordResetEmail(params: PasswordResetEmailParams): Promise<boolean> {
  const { firstName, resetUrl, expiresAt } = params
  const expiryMinutes = Math.round((expiresAt.getTime() - Date.now()) / (60 * 1000))

  if (!SENDGRID_API_KEY) {
    console.warn('[Mailer] SENDGRID_API_KEY not set. Password reset email would be sent to:', params.email)
    console.warn('[Mailer] Reset URL:', resetUrl)
    return true
  }

  try {
    const html = `
      <h1>Reset your password</h1>
      <p>Hi ${firstName},</p>
      <p>Click the link below to reset your Archject password:</p>
      <p><a href="${resetUrl}">Reset password</a></p>
      <p>This link expires in ${expiryMinutes} minutes.</p>
      <p>If you didn't request a password reset, you can ignore this email.</p>
      <p>— ${APP_NAME}</p>
    `
    await sgMail.send({
      to: params.email,
      from: { email: FROM_EMAIL, name: APP_NAME },
      subject: 'Reset your Archject password',
      html,
      categories: ['password-reset'],
    })
    return true
  } catch (err) {
    console.error('[Mailer] Password reset email error:', err)
    return false
  }
}
