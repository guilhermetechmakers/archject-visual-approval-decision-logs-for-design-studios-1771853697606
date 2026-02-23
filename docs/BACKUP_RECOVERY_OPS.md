# Backup & Recovery Operations

This document describes Archject's backup cadence, retention, and restore procedures. Align this with the Privacy Policy copy.

## Backup Cadence

- **Frequency**: Nightly snapshots
- **Time**: Configured via cron/scheduler (e.g., 02:00 UTC)
- **Scope**: Full database and file storage (attachments, exports)

## Retention

- **Retention period**: 90 days
- **Geographic replication**: Backups are stored in multiple regions for disaster recovery
- **Encryption**: AES-256 at rest; TLS 1.2+ in transit

## Restore Procedures

1. **Identify the restore point** from the backups table (`job_timestamp`, `snapshot_key`)
2. **Restore database** from the snapshot to a staging environment
3. **Restore file storage** (S3 or equivalent) from the snapshot
4. **Validate** data integrity before switching traffic
5. **Log** the restore event in `audit_logs`

## Data Export Archives

- Exports are generated on-demand via the privacy API
- Archives are stored in secure object storage with time-limited presigned URLs (24–72 hours)
- Export job processor: gathers user/project data, streams to JSON/CSV/PDF, zips, uploads

## Deletion Requests

- 14-day hold window before irreversible deletion
- User can cancel within the window via Account Settings
- After the window: account data is purged; backups containing the data are retained until backup retention expires, then purged per policy

## Admin Endpoints

- `GET /api/v1/privacy/backups` – backup summary (admin-only in production)
- `GET /api/v1/admin/privacy/requests` – list export/deletion requests for privacy team
