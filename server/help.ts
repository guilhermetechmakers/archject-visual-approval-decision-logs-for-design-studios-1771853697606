import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { db } from './db.js'

const helpRouter = Router()

// In-memory storage for uploads (MVP - use S3 in production)
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.bin'
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/gif', 'application/pdf']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Allowed: PNG, JPEG, GIF, PDF'))
    }
  },
})

// GET /api/kb - list/search KB articles (public)
helpRouter.get('/kb', (req: Request, res: Response) => {
  try {
    const query = (req.query.query as string) || ''
    const tags = req.query.tags as string | undefined
    const tagList = tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : []
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)))
    const sort = (req.query.sort as string) || 'updated_at'
    const sortDir = (req.query.sortDir as string) || 'desc'

    let where = 'published = 1'
    const params: unknown[] = []

    if (query.trim()) {
      where += ' AND (title LIKE ? OR excerpt LIKE ? OR body LIKE ?)'
      const like = `%${query.trim()}%`
      params.push(like, like, like)
    }

    if (tagList.length > 0) {
      const tagConditions = tagList.map(() => "tags LIKE ?").join(' OR ')
      where += ` AND (${tagConditions})`
      tagList.forEach((t) => params.push(`%${t}%`))
    }

    const orderCol = sort === 'title' ? 'title' : sort === 'created_at' ? 'created_at' : 'updated_at'
    const orderDir = sortDir === 'asc' ? 'ASC' : 'DESC'

    const countRow = db.prepare(`SELECT COUNT(*) as c FROM kb_articles WHERE ${where}`).get(...params) as { c: number }
    const rows = db.prepare(
      `SELECT id, slug, title, excerpt, tags, featured, updated_at, created_at
       FROM kb_articles WHERE ${where}
       ORDER BY featured DESC, ${orderCol} ${orderDir}
       LIMIT ? OFFSET ?`
    ).all(...params, limit, (page - 1) * limit) as {
      id: string
      slug: string
      title: string
      excerpt: string | null
      tags: string | null
      featured: number
      updated_at: string
      created_at: string
    }[]

    const articles = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      tags: r.tags ? r.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      featured: !!r.featured,
      updatedAt: r.updated_at,
      createdAt: r.created_at,
    }))

    res.json({ articles, total: countRow.c, page, limit })
  } catch (e) {
    console.error('[Help] GET /kb:', e)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch articles' })
  }
})

// GET /api/kb/featured - featured articles (public)
helpRouter.get('/kb/featured', (_req: Request, res: Response) => {
  try {
    const rows = db.prepare(
      `SELECT id, slug, title, excerpt, tags, updated_at
       FROM kb_articles WHERE published = 1 AND featured = 1
       ORDER BY updated_at DESC LIMIT 5`
    ).all() as { id: string; slug: string; title: string; excerpt: string | null; tags: string | null; updated_at: string }[]

    const articles = rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt,
      tags: r.tags ? r.tags.split(',').map((s) => s.trim()).filter(Boolean) : [],
      updatedAt: r.updated_at,
    }))

    res.json({ articles })
  } catch (e) {
    console.error('[Help] GET /kb/featured:', e)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch featured articles' })
  }
})

// GET /api/kb/:slug - single article (public)
helpRouter.get('/kb/:slug', (req: Request, res: Response) => {
  try {
    const { slug } = req.params
    const row = db.prepare(
      'SELECT id, slug, title, excerpt, body, tags, author_id, updated_at, created_at FROM kb_articles WHERE slug = ? AND published = 1'
    ).get(slug) as {
      id: string
      slug: string
      title: string
      excerpt: string | null
      body: string
      tags: string | null
      author_id: string | null
      updated_at: string
      created_at: string
    } | undefined

    if (!row) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Article not found' })
    }

    res.json({
      id: row.id,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      body: row.body,
      tags: row.tags ? (JSON.parse(row.tags) as string[]) : [],
      authorId: row.author_id,
      updatedAt: row.updated_at,
      createdAt: row.created_at,
    })
  } catch (e) {
    console.error('[Help] GET /kb/:slug:', e)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch article' })
  }
})

// GET /api/checklist - get onboarding checklist (auth optional)
helpRouter.get('/checklist', (req: Request, res: Response) => {
  try {
    const teamId = req.query.team_id as string | undefined
    const userId = req.query.user_id as string | undefined

    const defaultSteps = [
      { step_key: 'create_project', title: 'Create your first project', description: 'Set up a project and add decision options.', docSlug: 'getting-started' },
      { step_key: 'share_link', title: 'Share a client link', description: 'Generate and send a no-login approval link to your client.', docSlug: 'client-link' },
      { step_key: 'export_log', title: 'Export a Decision Log', description: 'Download a PDF or CSV of approved decisions.', docSlug: 'exports' },
    ]

    if (!teamId && !userId) {
      return res.json({
        steps: defaultSteps.map((s) => ({
          stepKey: s.step_key,
          title: s.title,
          description: s.description,
          docSlug: s.docSlug,
          status: 'not_started' as const,
        })),
        progress: 0,
      })
    }

    let where = '1=1'
    const params: unknown[] = []
    if (teamId) {
      where += ' AND (team_id = ? OR team_id IS NULL)'
      params.push(teamId)
    }
    if (userId) {
      where += ' AND (user_id = ? OR user_id IS NULL)'
      params.push(userId)
    }

    const rows = db.prepare(
      `SELECT id, step_key, status, metadata, updated_at FROM onboarding_checklists
       WHERE ${where} ORDER BY step_key`
    ).all(...params) as { id: string; step_key: string; status: string; metadata: string | null; updated_at: string }[]

    const stepMap = new Map(rows.map((r) => [r.step_key, r]))
    const steps = defaultSteps.map((s: { step_key: string; title: string; description: string; docSlug: string }) => {
      const existing = stepMap.get(s.step_key)
      return {
        stepKey: s.step_key,
        title: s.title,
        description: s.description,
        docSlug: s.docSlug,
        status: (existing?.status as 'not_started' | 'in_progress' | 'completed') || 'not_started',
        updatedAt: existing?.updated_at,
      }
    })

    const completed = steps.filter((s) => s.status === 'completed').length
    const progress = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0

    res.json({ steps, progress })
  } catch (e) {
    console.error('[Help] GET /checklist:', e)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to fetch checklist' })
  }
})

// POST /api/checklist - create/update checklist step
helpRouter.post('/checklist', (req: Request, res: Response) => {
  try {
    const { teamId, userId, stepKey, status } = req.body
    if (!stepKey || !['not_started', 'in_progress', 'completed'].includes(status)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'stepKey and status (not_started|in_progress|completed) required' })
    }

    const existing = db.prepare(
      'SELECT id FROM onboarding_checklists WHERE step_key = ? AND (team_id = ? OR (? IS NULL AND team_id IS NULL)) AND (user_id = ? OR (? IS NULL AND user_id IS NULL))'
    ).get(stepKey, teamId || null, teamId, userId || null, userId) as { id: string } | undefined

    const now = new Date().toISOString()
    if (existing) {
      db.prepare('UPDATE onboarding_checklists SET status = ?, updated_at = ? WHERE id = ?').run(status, now, existing.id)
      return res.json({ id: existing.id, stepKey, status, updatedAt: now })
    }

    const id = crypto.randomUUID()
    db.prepare(
      'INSERT INTO onboarding_checklists (id, team_id, user_id, step_key, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(id, teamId || null, userId || null, stepKey, status, now)
    res.status(201).json({ id, stepKey, status, updatedAt: now })
  } catch (e) {
    console.error('[Help] POST /checklist:', e)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to update checklist' })
  }
})

// POST /api/uploads - file upload (returns URL)
helpRouter.post('/uploads', upload.array('files', 5), (req: Request, res: Response) => {
  try {
    const files = (req as Request & { files: Express.Multer.File[] }).files
    if (!files || files.length === 0) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'No files uploaded' })
    }

    const baseUrl = process.env.UPLOAD_BASE_URL || '/uploads'
    const results = files.map((f) => ({
      url: `${baseUrl}/${f.filename}`,
      filename: f.originalname,
      size: f.size,
      mime: f.mimetype,
    }))

    res.status(201).json({ files: results })
  } catch (e) {
    console.error('[Help] POST /uploads:', e)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Upload failed' })
  }
})

// POST /api/support/ticket - create support ticket (public)
helpRouter.post('/support/ticket', (req: Request, res: Response) => {
  try {
    const { name, email, projectId, subject, description, attachments, source } = req.body

    if (!subject || typeof subject !== 'string' || subject.length > 255) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Subject required (max 255 chars)' })
    }
    if (!description || typeof description !== 'string' || description.length < 10) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Description required (min 10 chars)' })
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Valid email required' })
    }
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Name required (min 2 chars)' })
    }

    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const att = Array.isArray(attachments) ? JSON.stringify(attachments) : null
    const src = source === 'demo' ? 'demo' : source === 'landing' ? 'landing' : 'help-form'

    db.prepare(
      `INSERT INTO support_tickets (id, user_id, project_id, name, email, subject, description, attachments, status, source, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?)`
    ).run(id, null, projectId || null, name.trim(), email.trim(), subject.trim(), description.trim(), att, src, now, now)

    res.status(201).json({
      id,
      ticketId: id,
      message: 'Support request received. We typically respond within 24 hours.',
    })
  } catch (e) {
    console.error('[Help] POST /support/ticket:', e)
    res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to create support ticket' })
  }
})

export { helpRouter }
