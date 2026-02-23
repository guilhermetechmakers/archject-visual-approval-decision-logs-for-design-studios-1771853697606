# Loading / Processing Component

A reusable, accessible Loading and Processing overlay used across Archject for long-running background operations (exports, uploads, etc.).

## Overview

The Loading/Processing system provides:

- **LoadingOverlay** – Full-screen, modal, or inline overlay with progress
- **ProgressBar** – Determinate (percentage) or indeterminate (spinner)
- **StepperList** – Vertical step timeline with status indicators
- **ExportCompletion** – Success/failure result card with download actions

## Usage

### Basic Usage

```tsx
import { LoadingOverlay } from '@/components/loading-overlay'
import { createJob } from '@/api/jobs'

function MyPage() {
  const [jobId, setJobId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const handleExport = async () => {
    const { jobId } = await createJob({
      type: 'EXPORT_PDF',
      projectId: 'proj-1',
      payload: { decisionIds: ['dec-1'] },
    })
    setJobId(jobId)
    setOpen(true)
  }

  return (
    <>
      <Button onClick={handleExport}>Export</Button>
      <LoadingOverlay
        jobId={jobId}
        operationName="Generating approval pack"
        subtitle="Compiling Decision Log for Project: Riverside"
        open={open}
        onOpenChange={(o) => { setOpen(o); if (!o) setJobId(null) }}
        onRetry={handleExport}
        exportsPagePath="/dashboard/exports"
      />
    </>
  )
}
```

### Variants

- **modal** (default) – Centered card on soft backdrop, click outside to close (when finished)
- **fullscreen** – Same as modal but with more padding
- **inline** – Compact card for embedding in page content

### Props

| Prop | Type | Description |
|------|------|-------------|
| `jobId` | `string \| null` | Job ID from `createJob()`. When null, overlay is hidden. |
| `operationName` | `string` | Title (e.g. "Generating approval pack") |
| `subtitle` | `string?` | Context message |
| `variant` | `'fullscreen' \| 'modal' \| 'inline'` | Layout variant |
| `cancellable` | `boolean` | Show Cancel button (default: true) |
| `onCancel` | `() => void` | Called when user cancels |
| `onComplete` | `(job) => void` | Called when job completes successfully |
| `onError` | `(job) => void` | Called when job fails |
| `onClose` | `() => void` | Called when user closes overlay |
| `onRetry` | `() => void` | Called when user clicks Retry on failure |
| `autoClose` | `boolean` | Auto-close 1.5s after success (default: false) |
| `viewHistoryLink` | `string` | Link to export history (default: /dashboard/exports) |
| `decisionDetailLink` | `string?` | Link to open exported decision |

## Job API

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/jobs` | Create job. Body: `{ type, projectId?, payload, cancellable? }` |
| GET | `/api/jobs/:jobId` | Get job status |
| POST | `/api/jobs/:jobId/cancel` | Cancel job |
| GET | `/api/jobs` | List jobs (query: projectId, type, status, limit, offset) |
| GET | `/api/jobs/:jobId/stream` | SSE stream for real-time updates (query: token) |

### Job Types

- `EXPORT_PDF` – PDF Decision Log
- `EXPORT_CSV` – CSV export
- `SIGNING` – Document signing
- `UPLOAD` – File upload
- `GENERIC` – Generic background task

### Real-time Updates

The frontend subscribes to job updates via:

1. **SSE (preferred)** – `GET /api/jobs/:jobId/stream?token=<jwt>` – Server-Sent Events
2. **Polling (fallback)** – If SSE fails, polls `GET /api/jobs/:jobId` every 2s with exponential backoff (max 30s)

## useJobStatus Hook

```tsx
import { useJobStatus, createJob } from '@/hooks/use-job-status'

const { state, percent, step, message, resultUrls, error, job, cancel } = useJobStatus(jobId, {
  useSSE: true,
  onComplete: (job) => console.log('Done', job),
  onError: (job) => console.error('Failed', job.error),
})
```

## Accessibility

- `role="progressbar"` with `aria-valuenow` for determinate progress
- `aria-valuetext="Processing…"` for indeterminate
- `aria-live="polite"` for status updates
- `role="dialog"` with `aria-modal="true"` for overlay
- Escape key: cancels (if cancellable) or closes (when finished)
- Focus management: modal traps focus

## Integration Points

- **Decision Detail** – Export button opens LoadingOverlay
- **Exports Page** – Export to PDF/CSV buttons open LoadingOverlay
- **Create Decision** – Large file uploads can use LoadingOverlay (future)
