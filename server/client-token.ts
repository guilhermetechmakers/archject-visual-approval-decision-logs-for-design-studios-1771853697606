import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'

const CLIENT_TOKEN_SECRET = process.env.CLIENT_TOKEN_SECRET ?? process.env.JWT_SECRET ?? 'dev-secret'

export const clientTokenRouter = Router()

// GET /api/v1/client/token/validate?token=...
clientTokenRouter.get('/client/token/validate', (req: Request, res: Response) => {
  const token = req.query.token as string | undefined
  if (!token) {
    return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Token required' })
  }

  try {
    const decoded = jwt.verify(token, CLIENT_TOKEN_SECRET) as {
      projectId: string
      decisionIds?: string[]
      exp?: number
    }
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      return res.status(401).json({ code: 'TOKEN_EXPIRED', message: 'Token has expired' })
    }
    return res.json({
      valid: true,
      projectId: decoded.projectId,
      allowedDecisionIds: decoded.decisionIds ?? [],
    })
  } catch {
    return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid token' })
  }
})
