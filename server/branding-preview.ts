import { Router, Request, Response } from 'express'
import { db } from './db.js'

const brandingPreviewRouter = Router()

/**
 * GET /api/branding/:studioId/preview
 * Returns public branding data for a studio (read-only, no auth required).
 * Used for marketing preview of white-label client links.
 */
brandingPreviewRouter.get('/branding/:studioId/preview', (req: Request, res: Response) => {
  try {
    const { studioId } = req.params
    if (!studioId) {
      return res.status(400).json({
        code: 'VALIDATION_ERROR',
        message: 'Studio ID is required',
      })
    }

    const studio = db.prepare(
      `SELECT id, name, branding_logo_url, branding_invoice_accent_color
       FROM studios WHERE id = ?`
    ).get(studioId) as {
      id: string
      name: string
      branding_logo_url: string | null
      branding_invoice_accent_color: string | null
    } | undefined

    if (!studio) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Studio not found',
      })
    }

    res.json({
      studioId: studio.id,
      name: studio.name,
      logoUrl: studio.branding_logo_url,
      logoAlt: studio.name ? `${studio.name} logo` : 'Studio logo',
      primaryColor: studio.branding_invoice_accent_color ?? '#0052CC',
      customDomain: null,
    })
  } catch (e) {
    console.error('[Branding] GET /branding/:studioId/preview:', e)
    res.status(500).json({
      code: 'INTERNAL_ERROR',
      message: 'Failed to fetch branding preview',
    })
  }
})

export { brandingPreviewRouter }
