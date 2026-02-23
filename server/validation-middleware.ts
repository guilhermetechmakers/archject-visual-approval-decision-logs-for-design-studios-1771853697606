/**
 * Validation middleware for request body.
 * Returns 400 with structured field-level errors when validation fails.
 */
import { Request, Response, NextFunction } from 'express'
import { z, ZodError } from 'zod'

export interface ValidationSchemaMap {
  [key: string]: z.ZodSchema
}

/**
 * Create validation middleware for a given Zod schema.
 * Validates req.body and attaches parsed result to req.validatedBody.
 */
export function validateBody<T extends z.ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req.body) as z.infer<T>
      ;(req as Request & { validatedBody: z.infer<T> }).validatedBody = parsed
      next()
    } catch (e) {
      if (e instanceof ZodError) {
        const details = e.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code,
        }))
        res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details,
          retryable: false,
        })
        return
      }
      next(e)
    }
  }
}
