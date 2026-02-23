# Terms of Service – Admin & Management

This document describes how Terms of Service (ToS) content is managed, how to publish new versions, and how acceptance records can be queried and exported.

## Overview

- **Terms content** is stored in the `terms_versions` table (markdown + metadata).
- **Acceptances** are stored in `terms_acceptances` (user, version, timestamp, IP, user agent).
- The public `/terms` page displays the currently **published** version.
- Signup requires consent; the server records acceptance during signup.

## Database Schema

### terms_versions

| Column           | Type    | Description                                      |
|------------------|---------|--------------------------------------------------|
| id               | TEXT    | UUID primary key                                 |
| version_number   | TEXT    | e.g. "v1.0", "v1.1"                              |
| slug             | TEXT    | e.g. "terms-2026-02-23"                          |
| content_markdown  | TEXT    | Full ToS content in Markdown                     |
| content_html     | TEXT    | Optional pre-rendered HTML                       |
| effective_date   | TEXT    | ISO date (YYYY-MM-DD)                            |
| change_log       | TEXT    | JSON array of `{date, note}`                     |
| published        | INTEGER | 1 = active, 0 = draft/archived                   |
| created_by       | TEXT    | Admin user ID (optional)                         |
| created_at       | TEXT    | Timestamp                                        |
| updated_at       | TEXT    | Timestamp                                        |

### terms_acceptances

| Column      | Type | Description                          |
|-------------|------|--------------------------------------|
| id          | TEXT | UUID primary key                     |
| user_id     | TEXT | User who accepted (nullable for demo) |
| version_id  | TEXT | FK to terms_versions.id              |
| signup_id   | TEXT | Optional link to signup record      |
| accepted_at | TEXT | Timestamp                            |
| ip_address  | TEXT | Client IP                            |
| user_agent  | TEXT | Browser user agent                  |
| metadata    | TEXT | JSON (optional)                      |

## Admin Publish Process

### 1. Create a new ToS version

**Endpoint:** `POST /api/admin/terms`  
**Auth:** Admin JWT (Bearer token)  
**Roles:** `super-admin`, `admin`

**Request body:**

```json
{
  "version_number": "v1.1",
  "content_markdown": "## 1. Usage Rules\n\n...",
  "effective_date": "2026-03-01",
  "change_log": [
    { "date": "2026-03-01", "note": "Updated liability section" }
  ]
}
```

- `version_number`, `content_markdown`, and `effective_date` are required.
- `change_log` is optional; defaults to a single entry with the effective date.
- The new version is created with `published = 0` (draft).

### 2. Publish the version

**Endpoint:** `PATCH /api/admin/terms/:id/publish`  
**Auth:** Admin JWT  
**Roles:** `super-admin`, `admin`

- Sets the given version as `published = 1`.
- Automatically unpublishes any previously published version.
- The public `/terms` page will now show this version.

### 3. Workflow summary

1. Legal/product prepares markdown content.
2. Admin calls `POST /api/admin/terms` with the new content.
3. Admin reviews the draft (e.g. via `GET /api/terms/:id`).
4. Admin calls `PATCH /api/admin/terms/:id/publish` to go live.

## Public API Endpoints

| Method | Path              | Description                    |
|--------|-------------------|--------------------------------|
| GET    | /api/terms/active | Currently published ToS        |
| GET    | /api/terms/versions | List all versions           |
| GET    | /api/terms/:id    | Specific version by ID        |
| POST   | /api/terms/accept | Record acceptance (auth optional) |

## Querying & Exporting Acceptances

Acceptances are stored in `terms_acceptances`. Example queries:

**All acceptances for a version:**

```sql
SELECT * FROM terms_acceptances WHERE version_id = ? ORDER BY accepted_at DESC;
```

**Acceptances by user:**

```sql
SELECT ta.*, tv.version_number, tv.effective_date
FROM terms_acceptances ta
JOIN terms_versions tv ON ta.version_id = tv.id
WHERE ta.user_id = ?
ORDER BY ta.accepted_at DESC;
```

**Export to CSV (conceptual):**

```sql
SELECT
  ta.id,
  ta.user_id,
  ta.version_id,
  ta.accepted_at,
  ta.ip_address,
  ta.user_agent,
  tv.version_number,
  tv.effective_date
FROM terms_acceptances ta
JOIN terms_versions tv ON ta.version_id = tv.id
ORDER BY ta.accepted_at DESC;
```

In production, you would run this via an admin tool or script and output to CSV for audit purposes.

## Signup Consent Flow

1. User visits `/signup` and sees the "I have read and agree to the Terms of Service" checkbox.
2. User must check the box to submit the form.
3. On signup, the server receives `terms_accepted: true` and `terms_version_id`.
4. After creating the user, the server inserts a row into `terms_acceptances` with `user_id`, `version_id`, `accepted_at`, `ip_address`, and `user_agent`.

## Caching

- The public ToS page fetches `/api/terms/active` on load.
- Consider adding HTTP cache headers (e.g. `Cache-Control: public, max-age=300`) for the active endpoint.
- Invalidate or reduce TTL when a new version is published.
