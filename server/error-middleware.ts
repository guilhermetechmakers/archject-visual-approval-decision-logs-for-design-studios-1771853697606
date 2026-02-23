import { Request, Response, NextFunction } from 'express'
import crypto from 'crypto'
import { db } from './db.js'

function sanitize(str: unknown, maxLen: number): string | null {
  if (str == null) return null
  const s = String(str).trim()
  return s.length > 0 ? s.slice(0, maxLen) : null
}

/** Structured error response shape: { code, message, details[], correlationId, retryable } */
export interface StructuredErrorResponse {
  code: string
  message: string
  details?: Array<{ field?: string; message: string; code?: string }>
  correlationId: string
  incidentId?: string
  retryable: boolean
}

/**
 * Assign X-Request-Id (correlationId) to each request.
 */
export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const existing = req.headers['x-request-id']
  const id = typeof existing === 'string' ? existing : crypto.randomUUID()
  ;(req as Request & { requestId?: string }).requestId = id
  next()
}

/**
 * Central error handler: catch unhandled exceptions, log with correlationId,
 * return standardized 500 response with incidentId, details, and retryable flag.
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as Request & { requestId?: string }).requestId ?? crypto.randomUUID()
  const incidentId = crypto.randomUUID()

  console.error(`[${incidentId}] Unhandled error:`, err.message, err.stack)

  try {
    db.prepare(
      `INSERT INTO server_errors (
        id, correlation_id, created_at, user_id, route, method, url,
        error_message, stack_summary, client_context, tags, resolved, resolved_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, NULL)`
    ).run(
      incidentId,
      requestId,
      new Date().toISOString(),
      null,
      sanitize(req.path, 2048) ?? req.path,
      req.method,
      req.originalUrl,
      sanitize(err.message, 4096) ?? 'Unknown error',
      sanitize(err.stack, 3000),
      null,
      null
    )
  } catch (dbErr) {
    console.error('[ErrorMiddleware] Failed to persist error:', dbErr)
  }

  const payload: StructuredErrorResponse = {
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    correlationId: requestId,
    incidentId,
    retryable: true,
  }

  res.status(500).json(payload)
}

/** Helper to send structured 400 validation error with field-level details */
export function sendValidationError(
  res: Response,
  req: Request,
  message: string,
  details: Array<{ field?: string; message: string; code?: string }>
): void {
  const requestId = (req as Request & { requestId?: string }).requestId ?? crypto.randomUUID()
  res.status(400).json({
    code: 'VALIDATION_ERROR',
    message,
    details,
    correlationId: requestId,
    retryable: false,
  })
}

/** Helper to send structured 404 */
export function sendNotFound(res: Response, req: Request, message: string): void {
  const requestId = (req as Request & { requestId?: string }).requestId ?? crypto.randomUUID()
  res.status(404).json({
    code: 'NOT_FOUND',
    message,
    correlationId: requestId,
    retryable: false,
  })
}
