import sgMail from '@sendgrid/mail';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY ?? '';
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? 'noreply@archject.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? 'support@archject.com';
const APP_NAME = 'Archject';
const VERIFY_BASE_URL = process.env.VERIFY_BASE_URL ?? 'http://localhost:5173';
if (SENDGRID_API_KEY) {
    sgMail.setApiKey(SENDGRID_API_KEY);
}
export async function sendVerificationEmail(params) {
    const { firstName, verificationUrl, expiresAt, studioName } = params;
    const expiryHours = Math.round((expiresAt.getTime() - Date.now()) / (60 * 60 * 1000));
    const dynamicTemplateData = {
        first_name: firstName,
        studio_name: studioName ?? 'your studio',
        verification_url: verificationUrl,
        expiry_hours: String(expiryHours),
        support_email: SUPPORT_EMAIL,
    };
    const templateId = process.env.SENDGRID_VERIFICATION_TEMPLATE_ID;
    if (!SENDGRID_API_KEY) {
        console.warn('[Mailer] SENDGRID_API_KEY not set. Verification email would be sent to:', params.email);
        console.warn('[Mailer] Verification URL:', verificationUrl);
        return true;
    }
    try {
        if (templateId) {
            await sgMail.send({
                to: params.email,
                from: { email: FROM_EMAIL, name: APP_NAME },
                templateId,
                dynamicTemplateData,
                categories: ['verification-email'],
            });
        }
        else {
            const html = `
        <h1>Verify your email</h1>
        <p>Hi ${firstName},</p>
        <p>Click the link below to verify your email and activate your Archject account:</p>
        <p><a href="${verificationUrl}">Verify your email</a></p>
        <p>This link expires in ${dynamicTemplateData.expiry_hours} hours.</p>
        <p>If you didn't create an account, you can ignore this email.</p>
        <p>— ${APP_NAME}</p>
      `;
            await sgMail.send({
                to: params.email,
                from: { email: FROM_EMAIL, name: APP_NAME },
                subject: 'Verify your Archject account',
                html,
                categories: ['verification-email'],
            });
        }
        return true;
    }
    catch (err) {
        console.error('[Mailer] SendGrid error:', err);
        return false;
    }
}
export async function sendPasswordResetEmail(params) {
    const { firstName, resetUrl, expiresAt } = params;
    const expiryMinutes = Math.round((expiresAt.getTime() - Date.now()) / (60 * 1000));
    if (!SENDGRID_API_KEY) {
        console.warn('[Mailer] SENDGRID_API_KEY not set. Password reset email would be sent to:', params.email);
        console.warn('[Mailer] Reset URL:', resetUrl);
        return true;
    }
    try {
        const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px; font-weight: 600; color: #111827;">Reset your password</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #374151;">Hi ${firstName},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #374151;">We received a request to reset your Archject password. Click the button below to create a new password:</p>
        <p style="margin: 24px 0;">
          <a href="${resetUrl}" style="display: inline-block; background: #0052CC; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">Reset password</a>
        </p>
        <p style="font-size: 14px; color: #6B7280;">This link expires in ${expiryMinutes} minutes and can only be used once.</p>
        <p style="font-size: 14px; color: #6B7280;">If you didn't request this, you can safely ignore this email. Your password will not be changed.</p>
        <p style="font-size: 14px; color: #6B7280;">Need help? Contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
        <p style="font-size: 14px; color: #9CA3AF; margin-top: 32px;">— ${APP_NAME}</p>
      </div>
    `;
        await sgMail.send({
            to: params.email,
            from: { email: FROM_EMAIL, name: APP_NAME },
            subject: 'Reset your Archject password',
            html,
            categories: ['password-reset'],
        });
        return true;
    }
    catch (err) {
        console.error('[Mailer] Password reset email error:', err);
        return false;
    }
}
export async function sendPasswordChangedEmail(params) {
    const { firstName, email } = params;
    if (!SENDGRID_API_KEY) {
        console.warn('[Mailer] SENDGRID_API_KEY not set. Password changed email would be sent to:', email);
        return true;
    }
    try {
        const html = `
      <div style="font-family: Inter, system-ui, sans-serif; max-width: 480px; margin: 0 auto;">
        <h1 style="font-size: 22px; font-weight: 600; color: #111827;">Your password was changed</h1>
        <p style="font-size: 15px; line-height: 1.6; color: #374151;">Hi ${firstName},</p>
        <p style="font-size: 15px; line-height: 1.6; color: #374151;">This is a confirmation that your Archject password was successfully changed.</p>
        <p style="font-size: 14px; color: #6B7280;">If you did not make this change, please contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> immediately.</p>
        <p style="font-size: 14px; color: #9CA3AF; margin-top: 32px;">— ${APP_NAME}</p>
      </div>
    `;
        await sgMail.send({
            to: email,
            from: { email: FROM_EMAIL, name: APP_NAME },
            subject: 'Your Archject password was changed',
            html,
            categories: ['password-changed'],
        });
        return true;
    }
    catch (err) {
        console.error('[Mailer] Password changed email error:', err);
        return false;
    }
}
