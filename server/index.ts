import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import path from 'path'
import { initDb } from './db.js'
import { requestIdMiddleware, errorHandler } from './error-middleware.js'
import { authRouter } from './auth.js'
import { usersRouter } from './users.js'
import { uploadsRouter } from './uploads.js'
import { studiosRouter } from './studios.js'
import { oauthRouter } from './oauth.js'
import { webhooksRouter } from './webhooks.js'
import { billingRouter } from './billing.js'
import { adminRouter } from './admin.js'
import { analyticsRouter } from './analytics.js'
import { helpRouter } from './help.js'
import { privacyRouter } from './privacy.js'
import { termsRouter } from './terms.js'
import { logsRouter } from './logs.js'
import { supportReportRouter } from './support-report.js'
import { errorsRouter } from './errors.js'
import { supportTicketRouter } from './support-ticket.js'
import { jobsRouter } from './jobs.js'
import { v1Router } from './v1.js'
import { leadsRouter } from './leads.js'
import { brandingPreviewRouter } from './branding-preview.js'

initDb()

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: true, credentials: true }))
app.use(cookieParser())
app.use(express.json())
app.use(requestIdMiddleware)

app.use('/api/auth/oauth', oauthRouter)
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/uploads', uploadsRouter)
app.use('/api/studios', studiosRouter)
app.use('/api/admin', adminRouter)
app.use('/api', analyticsRouter)
app.use('/api', billingRouter)
app.use('/api', helpRouter)
app.use('/api', logsRouter)
app.use('/api', supportReportRouter)
app.use('/api', errorsRouter)
app.use('/api', supportTicketRouter)
app.use('/api', jobsRouter)
app.use('/api/v1', v1Router)
app.use('/api', leadsRouter)
app.use('/api', brandingPreviewRouter)
app.use('/api', privacyRouter)
app.use('/api/terms', termsRouter)
app.use('/webhooks', webhooksRouter)

const uploadsDir = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadsDir))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain')
  res.send(`User-agent: *
Allow: /

Sitemap: https://archject.com/sitemap.xml`)
})

app.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml')
  const base = 'https://archject.com'
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${base}/</loc><changefreq>weekly</changefreq><priority>1</priority></url>
  <url><loc>${base}/pricing</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>${base}/about</loc><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>${base}/help</loc><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>${base}/privacy</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${base}/terms</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
  <url><loc>${base}/auth</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>
</urlset>`)
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Archject API server running on http://localhost:${PORT}`)
})
