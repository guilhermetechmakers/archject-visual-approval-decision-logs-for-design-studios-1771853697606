# Archject Error Pipeline (500 Server Error)

This document describes how the 500 Server Error pipeline works, configuration options, and how to wire it into the router and API layer.

## Overview

When a server error (HTTP 500) or unhandled exception occurs, the app:

1. Captures the failure via HTTP interceptor or `GlobalErrorBoundary`
2. Calls `POST /api/errors/report` with context; server returns `incidentId`
3. Renders the `ServerErrorPage` with incident ID and recovery actions
4. User can retry, contact support, copy incident ID, or return to dashboard

## Components

### Frontend

| Component | Purpose |
|-----------|---------|
| `GlobalErrorBoundary` | Catches render-time errors and unhandled React errors; reports to API and renders `ServerErrorPage` |
| `ServerErrorGate` | Listens for `archject:server-error` custom events (from API 5xx responses); renders `ServerErrorPage` |
| `ServerErrorPage` | Full-screen centered card with headline, incident ID, Retry, Contact support, Back to dashboard |
| `SupportModal` | Modal for submitting support tickets with incident ID prefilled |
| `ErrorReporter` | Centralized service to format and send error events to `POST /api/errors/report` |
| `RetryManager` | Utilities: `retryPage()`, `retryRequest()`, `retryWithBackoff()` |

### Backend

| Endpoint | Purpose |
|----------|---------|
| `POST /api/errors/report` | Accept error payload, persist to `server_errors` table, return `incidentId` |
| `POST /api/support/ticket` | Create support ticket linked to incident ID |
| `requestIdMiddleware` | Assigns `X-Request-Id` (correlation ID) to each request |
| `errorHandler` | Catches unhandled exceptions, logs to `server_errors`, returns 500 with `incidentId` |

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_ERROR_REPORTING_ENABLED` | `true` | Set to `false` to disable automatic error report submission (user privacy / opt-out) |
| `VITE_API_URL` | `/api` | Base URL for API requests |
| `VITE_APP_VERSION` | `1.0.0` | App version included in error reports |

### Toggling Error Reporting

To disable automatic submission of error reports (e.g. for privacy compliance):

```env
VITE_ERROR_REPORTING_ENABLED=false
```

When disabled, the app still shows the 500 UI with a client-generated incident ID, but does not send reports to the backend.

## Integration

### Router

The `GlobalErrorBoundary` and `ServerErrorGate` wrap the app in `App.tsx`:

```tsx
<GlobalErrorBoundary>
  <BrowserRouter>
    <ServerErrorGate>
      <AuthProvider>
        <Routes>...</Routes>
      </AuthProvider>
    </ServerErrorGate>
  </BrowserRouter>
</GlobalErrorBoundary>
```

### API / Fetch Interceptor

The `apiFetch` function in `src/lib/api.ts` intercepts 5xx responses:

1. Parses response body for `incidentId` or `correlationId`
2. If not present, calls `reportError()` to get an incident ID
3. Dispatches `archject:server-error` custom event with incident ID
4. `ServerErrorGate` listens and renders `ServerErrorPage`

### Route-Level Error Boundaries

For pages with complex components (decision viewer, approval flows, file viewer), you can add route-level error boundaries:

```tsx
<Route
  path="/projects/:projectId/decisions/:decisionId"
  element={
    <ErrorBoundary fallback={<ServerErrorPage incidentId="..." onRetry={...} />}>
      <DecisionDetail />
    </ErrorBoundary>
  }
/>
```

## API Contract

### POST /api/errors/report

**Request:**

```json
{
  "timestamp": "2026-02-23T12:34:56Z",
  "userId": "uuid-or-null",
  "route": "/projects/abc/decision/123",
  "method": "GET",
  "url": "https://app.archject.com/projects/abc/decision/123",
  "errorMessage": "TypeError: Cannot read property 'foo' of undefined",
  "stackTraceSummary": "Components/DecisionView.tsx:45 ...",
  "clientContext": { "browser": "Chrome 113", "os": "macOS 12.6", "appVersion": "1.2.5" },
  "tags": ["production", "decision-view"]
}
```

**Response (200):**

```json
{
  "incidentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "receivedAt": "2026-02-23T12:34:56Z"
}
```

### POST /api/support/ticket

**Request:**

```json
{
  "incidentId": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
  "userId": "uuid-or-null",
  "email": "user@example.com",
  "message": "I was trying to load the decision when the error occurred."
}
```

**Response (201):**

```json
{
  "ticketId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "status": "open"
}
```

## Data Models

### server_errors

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | incidentId (UUID) |
| correlation_id | TEXT | X-Request-Id |
| created_at | TEXT | ISO8601 |
| user_id | TEXT | nullable |
| route | TEXT | |
| method | TEXT | |
| url | TEXT | |
| error_message | TEXT | |
| stack_summary | TEXT | truncated to 3000 chars |
| client_context | TEXT | JSON |
| tags | TEXT | JSON array |
| resolved | INTEGER | 0/1 |
| resolved_at | TEXT | nullable |

### support_tickets

| Column | Type | Description |
|--------|------|-------------|
| ticket_id | TEXT | UUID |
| incident_id | TEXT | FK to server_errors.id |
| user_id | TEXT | nullable |
| email | TEXT | nullable |
| message | TEXT | |
| status | TEXT | open, closed, pending |
| created_at | TEXT | |
| updated_at | TEXT | |

## Testing

Navigate to `/500` to see the Server Error page in isolation.

To simulate a 500 from the API, you can temporarily modify a route to return 500 or use a mock server.
