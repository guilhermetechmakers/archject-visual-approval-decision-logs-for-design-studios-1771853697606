import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import multer from 'multer'
import { db } from './db.js'
import { getUserIdFromAccessToken } from './auth-utils.js'

const UPLOAD_BASE = process.env.UPLOAD_BASE_URL ?? '/uploads'
const AVATAR_MAX_SIZE = 5 * 1024 * 1024 // 5MB
const LOGO_MAX_SIZE = 2 * 1024 * 1024 // 2MB
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_LOGO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']

const uploadDir = path.join(process.cwd(), 'uploads')
const avatarDir = path.join(uploadDir, 'avatars')
const logoDir = path.join(uploadDir, 'logos')

;[uploadDir, avatarDir, logoDir].forEach((d) => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
})

function requireAuth(req: Request, res: Response, next: () => void) {
  const userId = getUserIdFromAccessToken(req)
  if (!userId) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authentication required' })
    return
  }
  ;(req as Request & { userId: string }).userId = userId
  next()
}

const avatarStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, avatarDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg'
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const logoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, logoDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.png'
    cb(null, `${crypto.randomUUID()}${ext}`)
  },
})

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: AVATAR_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP'))
    }
  },
})

const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: LOGO_MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_LOGO_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Allowed: JPEG, PNG, WebP, SVG'))
    }
  },
})

export const uploadsRouter = Router()

// POST /uploads/avatar - upload avatar, returns signed URL (local: relative path)
uploadsRouter.post('/avatar', requireAuth, avatarUpload.single('file'), (req: Request, res: Response) => {
  try {
    const userId = (req as Request & { userId: string }).userId
    const file = req.file
    if (!file) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'No file uploaded' })
    }

    const url = `${UPLOAD_BASE}/avatars/${file.filename}`
    db.prepare('UPDATE users SET avatar_url = ?, updated_at = datetime("now") WHERE id = ?').run(url, userId)

    const user = db.prepare('SELECT avatar_url FROM users WHERE id = ?').get(userId) as { avatar_url: string }
    return res.status(201).json({
      signedUrl: url,
      key: file.filename,
      avatar_url: user.avatar_url,
      variants: { thumb: url, small: url, large: url },
    })
  } catch (err) {
    console.error('[Uploads] Avatar error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Upload failed' })
  }
})

// POST /uploads/logo - upload studio logo
uploadsRouter.post('/logo', requireAuth, logoUpload.single('file'), (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'No file uploaded' })
    }

    const url = `${UPLOAD_BASE}/logos/${file.filename}`
    return res.status(201).json({ url, key: file.filename })
  } catch (err) {
    console.error('[Uploads] Logo error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Upload failed' })
  }
})

// POST /uploads/logo - upload studio logo
uploadsRouter.post('/logo', requireAuth, logoUpload.single('file'), (req: Request, res: Response) => {
  try {
    const file = req.file
    if (!file) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'No file uploaded' })
    }

    const url = `${UPLOAD_BASE}/logos/${file.filename}`
    return res.status(201).json({
      url,
      key: file.filename,
    })
  } catch (err) {
    console.error('[Uploads] Logo error:', err)
    return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Upload failed' })
  }
})
