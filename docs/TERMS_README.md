# Terms of Service - Admin & Acceptance Guide

## Overview

Archject stores versioned Terms of Service (ToS) content and records user acceptance for compliance and audit. This document describes how ToS content is managed, how acceptance is recorded, and how to query/export acceptance records.

## Database Schema

### terms_versions

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| version_number | TEXT | Semantic version (e.g., "v1.0") |
| slug | TEXT | URL-friendly identifier (e.g., "terms-2026-02-23") |
| content_markdown | TEXT | Full ToS content in Markdown |
| content_html | TEXT | Optional pre-rendered HTML |
| effective_date | TEXT | ISO date (YYYY-MM-DD) |
| change_log | TEXT | JSON array of `{date, note}` |
| published | INTEGER | 1 = active, 0 = draft |
| created_by | TEXT | Admin user ID |
| created_at | TEXT | Timestamp |
| updated_at | TEXT | Timestamp |

### terms_acceptances

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT (UUID) | Primary key |
| user_id | TEXT | User ID (nullable for guest/demo) |
| version_id | TEXT | FK to terms_versions.id |
| signup_id | TEXT | Optional link to signup record |
| accepted_at | TEXT | Timestamp |
| ip_address | TEXT | Client IP |
| user_agent | TEXT | Browser user agent |
| metadata | TEXT | Optional JSON |

## API Endpoints

### Public

- **GET /api/terms/active** – Returns the currently published ToS
- **GET /api/terms/versions** – Lists all versions with published flag
- **GET /api/terms/:id** – Returns a specific version
- **POST /api/terms/accept** – Records acceptance (authenticated or anonymous)

### Admin (requires admin JWT)

- **POST /api/admin/terms** – Create new version (body: `version_number`, `content_markdown`, `effective_date`, `change_log?`)
- **PATCH /api/admin/terms/:id/publish** – Publish a version (unpublishes previous)

## Admin Publish Process

1. **Create a new version**  
   POST `/api/admin/terms` with:
   - `version_number`: e.g. `"v1.1"`
   - `content_markdown`: Full ToS in Markdown
   - `effective_date`: `"YYYY-MM-DD"`
   - `change_log`: `[{ "date": "YYYY-MM-DD", "note": "Description of change" }]`

2. **Publish the version**  
   PATCH `/api/admin/terms/:id/publish` with the new version's `id`.  
   This sets `published = 1` for that version and `published = 0` for all others.

3. **Verify**  
   GET `/api/terms/active` returns the newly published version.

## Signup Consent Flow

1. User sees the signup form with a required checkbox: "I have read and agree to the Terms of Service" (link opens /terms in new tab).
2. On submit, the frontend sends `terms_accepted: true` and `terms_version_id` (active version ID) to POST `/api/auth/signup`.
3. The auth backend creates the user and inserts a row into `terms_acceptances` with `user_id`, `version_id`, `ip_address`, and `user_agent`.

## Querying & Exporting Acceptances

Acceptance records are stored in `terms_acceptances`. Example queries:

```sql
-- All acceptances for a version
SELECT * FROM terms_acceptances WHERE version_id = ?;

-- Acceptances by user
SELECT * FROM terms_acceptances WHERE user_id = ?;

-- Acceptances in date range
SELECT * FROM terms_acceptances WHERE accepted_at >= ? AND accepted_at <= ?;

-- Export-ready (CSV columns)
SELECT id, user_id, version_id, accepted_at, ip_address, user_agent
FROM terms_acceptances
ORDER BY accepted_at DESC;
```

For CSV export, run the query and format the result. The schema supports audit requirements: user, version, timestamp, IP, and user agent are all stored.

## Content Management

- ToS content is stored as **Markdown** in `content_markdown`.
- The frontend renders it with `react-markdown` (safe, no raw HTML by default).
- To update content: create a new version via the admin API, then publish it. Old versions remain in revision history.

## Seed Data

On first run, the migration `008_terms.sql` creates the tables and `seedTermsVersion()` inserts an initial published version (v1.0) with placeholder legal sections.
