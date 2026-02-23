import { ZodError } from 'zod';
/**
 * Create validation middleware for a given Zod schema.
 * Validates req.body and attaches parsed result to req.validatedBody.
 */
export function validateBody(schema) {
    return (req, res, next) => {
        try {
            const parsed = schema.parse(req.body);
            req.validatedBody = parsed;
            next();
        }
        catch (e) {
            if (e instanceof ZodError) {
                const details = e.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                    code: err.code,
                }));
                res.status(400).json({
                    code: 'VALIDATION_ERROR',
                    message: 'Validation failed',
                    details,
                    retryable: false,
                });
                return;
            }
            next(e);
        }
    };
}
