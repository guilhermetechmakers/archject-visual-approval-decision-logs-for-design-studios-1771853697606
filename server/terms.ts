import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

function parseJson<T>(str: string | null): T | null {
  if (!str) return null
  try {
    return JSON.parse(str) as T
  } catch {
    return null
  }
}

function optionalAuth(req: Request): string | null {
  const auth = req.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  try {
    const decoded = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string }
    return decoded.sub
  } catch {
    return null
  }
}

export const termsRouter = Router()

// GET /api/terms/active - currently published ToS
termsRouter.get('/active', (_req: Request, res: Response) => {
  try {
    const row = db.prepare(
      'SELECT id, version_number, slug, content_markdown, content_html, effective_date, change_log FROM terms_versions WHERE published = 1 LIMIT 1'
    ).get() as {
      id: string
      version_number: string
      slug: string
      content_markdown: string
      content_html: string | null
      effective_date: string
      change_log: string
    } | undefined

    if (!row) {
      return res.status(404).json({ message: 'No published terms version found' })
    }

    const changeLog = parseJson<Array<{ date: string; note: string }>>(row.change_log) ?? []
    return res.json({
      id: row.id,
      version_number: row.version_number,
      slug: row.slug,
      content_markdown: row.content_markdown,
      content_html: row.content_html,
      effective_date: row.effective_date,
      change_log: changeLog,
    })
  } catch (err) {
    console.error('[Terms] Get active error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

// GET /api/terms/versions - list all versions
termsRouter.get('/versions', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare(
      'SELECT id, version_number, effective_date, published, change_log FROM terms_versions ORDER BY effective_date DESC LIMIT 50'
    ).all() as Array<{
      id: string
      version_number: string
      effective_date: string
      published: number
      change_log: string
    }>

    const versions = rows.map((r) => ({
      id: r.id,
      version_number: r.version_number,
      effective_date: r.effective_date,
      published: Boolean(r.published),
      change_log: parseJson<Array<{ date: string; note: string }>>(r.change_log) ?? [],
    }))

    return res.json(versions)
  } catch (err) {
    console.error('[Terms] Get versions error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

// GET /api/terms/:id - specific version
termsRouter.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const row = db.prepare('SELECT * FROM terms_versions WHERE id = ?').get(id) as {
      id: string
      version_number: string
      slug: string
      content_markdown: string
      content_html: string | null
      effective_date: string
      change_log: string
    } | undefined

    if (!row) {
      return res.status(404).json({ message: 'Terms version not found' })
    }

    const changeLog = parseJson<Array<{ date: string; note: string }>>(row.change_log) ?? []
    return res.json({
      id: row.id,
      version_number: row.version_number,
      slug: row.slug,
      content_markdown: row.content_markdown,
      content_html: row.content_html,
      effective_date: row.effective_date,
      change_log: changeLog,
    })
  } catch (err) {
    console.error('[Terms] Get version error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

// POST /api/terms/accept - record acceptance (authenticated or anonymous for demo)
termsRouter.post('/accept', (req: Request, res: Response) => {
  try {
    const { userId, versionId, signupId } = req.body ?? {}
    const tokenUserId = optionalAuth(req)

    if (!versionId || typeof versionId !== 'string') {
      return res.status(400).json({ message: 'versionId is required' })
    }

    const version = db.prepare('SELECT id FROM terms_versions WHERE id = ?').get(versionId) as { id: string } | undefined
    if (!version) {
      return res.status(400).json({ message: 'Invalid version ID' })
    }

    const effectiveUserId = tokenUserId ?? userId ?? null
    if (tokenUserId && userId && tokenUserId !== userId) {
      return res.status(403).json({ message: 'User ID does not match token' })
    }

    const id = crypto.randomUUID()
    const ip = req.ip ?? req.socket?.remoteAddress ?? null
    const userAgent = req.get('user-agent') ?? null

    db.prepare(
      `INSERT INTO terms_acceptances (id, user_id, version_id, signup_id, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, effectiveUserId, versionId, signupId ?? null, ip, userAgent)

    return res.status(201).json({ acceptanceId: id })
  } catch (err) {
    console.error('[Terms] Accept error:', err)
    return res.status(500).json({ message: 'An error occurred' })
  }
})

