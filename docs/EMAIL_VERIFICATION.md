# Email Verification - Archject

## Overview

Production-ready email verification flow for Archject. Verifies ownership of new accounts, unlocks critical actions (creating projects, inviting clients), supports secure resends with rate limiting, and integrates with SendGrid.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create user, send verification email |
| POST | `/api/auth/login` | Login (requires verified email) |
| POST | `/api/auth/verify-email` | Verify token, mark user verified |
| POST | `/api/auth/resend-verification` | Resend verification email |
| GET | `/api/auth/verification-status?email=` | Check verification state |
| POST | `/webhooks/sendgrid` | SendGrid delivery events |

## Environment Variables

```
SENDGRID_API_KEY=           # SendGrid API key
SENDGRID_FROM_EMAIL=        # Verified sender (e.g. noreply@archject.com)
SENDGRID_VERIFICATION_TEMPLATE_ID=  # Optional dynamic template ID
VERIFY_BASE_URL=            # Base URL for verification links (e.g. https://app.archject.com)
JWT_SECRET=                 # Secret for JWT signing
HMAC_SECRET=                # Secret for token hashing
```

## Running the Server

```bash
npm run server:build
npm run server
```

The API runs on port 3001 by default. Set `PORT` to override.

## SendGrid Setup

1. Create a transactional template with placeholders:
   - `{{first_name}}`
   - `{{studio_name}}`
   - `{{verification_url}}`
   - `{{expiry_hours}}`
   - `{{support_email}}`

2. Configure webhook URL: `https://your-api.com/webhooks/sendgrid`

3. Enable events: delivered, open, click, bounce, blocked

## Rate Limits

- Per user: 5 resends per 24 hours
- Per IP: 20 attempts per hour

## Token Security

- 48-byte random hex tokens
- Stored as HMAC-SHA256 hash only
- Single-use, 24-hour expiry
- Constant-time comparison
