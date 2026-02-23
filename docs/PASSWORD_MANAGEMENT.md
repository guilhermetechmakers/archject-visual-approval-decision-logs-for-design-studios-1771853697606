# Password Management & Reset

## Overview

Archject implements secure password management including:
- Password reset request flow (email-based, one-time tokens)
- Password reset completion (token validation, session invalidation)
- Change password from User Profile (authenticated, current password required)

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SENDGRID_API_KEY` | SendGrid API key for email delivery | (required for production) |
| `SENDGRID_FROM_EMAIL` | From address for emails | `noreply@archject.com` |
| `SUPPORT_EMAIL` | Support contact for email templates | `support@archject.com` |
| `VERIFY_BASE_URL` | Base URL for reset links (e.g. `https://app.archject.com`) | `http://localhost:5173` |
| `HMAC_SECRET` | Server pepper for token hashing | `archject-verification-salt` |
| `JWT_SECRET` | JWT signing secret | (required for production) |

### Token TTL

- **Password reset token**: 60 minutes (configurable via `PASSWORD_RESET_EXPIRY_MINUTES` in `server/auth.ts`)
- Tokens are one-time use; marked `used_at` when consumed

### Rate Limits

| Endpoint | Per IP | Per Account/Token | Window |
|----------|--------|-------------------|--------|
| `POST /auth/password-reset-request` | 5 | 3 per email | 1 hour |
| `POST /auth/password-reset` | 10 | 5 per token | 1 hour |

On rate limit (429), the response includes `retry_after` (seconds) and `Retry-After` header.

## API Endpoints

### POST /auth/password-reset-request

Request a password reset link.

**Body:** `{ "email": "user@example.com" }`

**Responses:**
- `200`: Generic success message (never reveals if account exists)
- `429`: Rate limited (`Retry-After` header)
- `503`: Email delivery failed

### GET /auth/password-reset-validate

Validate a reset token before showing the form.

**Query:** `?token=<token>`

**Responses:**
- `200`: `{ "valid": true }`
- `400`: `{ "valid": false, "message": "Invalid or expired link" }`

### POST /auth/password-reset

Complete password reset with token.

**Body:** `{ "token": "...", "password": "..." }` (or `newPassword` for backward compat)

**Responses:**
- `200`: Success, returns `accessToken`, `sessionToken`, `user`
- `400`: Invalid or expired token
- `429`: Rate limited

### PUT /users/me/password (or POST)

Change password when authenticated.

**Body:** `{ "currentPassword": "...", "newPassword": "..." }`

**Responses:**
- `200`: Success
- `401`: Invalid current password
- `400`: Validation error (e.g. weak new password)

## Security

- Tokens: 32 bytes base64url, hashed with HMAC-SHA256 before storage
- Passwords: bcrypt, 12+ characters, uppercase, lowercase, digit, symbol
- On password change/reset: all refresh tokens and sessions revoked
- Audit events: `PASSWORD_RESET_REQUEST`, `PASSWORD_RESET_COMPLETED`, `PASSWORD_CHANGED`

## Operational Runbook: Reset Abuse

1. **Check audit logs**
   ```sql
   SELECT * FROM audit_logs WHERE action IN ('PASSWORD_RESET_REQUEST', 'PASSWORD_RESET_COMPLETED')
   ORDER BY created_at DESC LIMIT 100;
   ```

2. **Check password_reset_tokens**
   ```sql
   SELECT id, user_id, request_ip, request_user_agent, created_at, used_at
   FROM password_reset_tokens
   ORDER BY created_at DESC LIMIT 50;
   ```

3. **Identify patterns**
   - High volume from single IP → consider blocking at edge
   - Many requests for non-existent emails → enumeration attempt
   - Repeated token attempts → brute-force; rate limit should mitigate

4. **Metrics to monitor**
   - Reset requests per hour (by IP, by email)
   - Reset completions vs. requests (ratio)
   - 429 responses (rate limit hits)

5. **If abuse detected**
   - Reduce rate limits in `server/rate-limit.ts`
   - Add IP to blocklist at API gateway
   - Contact support for affected users if needed

## Post-Deployment Checklist

- [ ] Verify `VERIFY_BASE_URL` points to production domain
- [ ] Test reset flow end-to-end (request → email → reset → sign in)
- [ ] Confirm email deliverability (check spam, SendGrid logs)
- [ ] Monitor `audit_logs` for reset events
- [ ] Ensure HTTPS for all reset links
