import express from 'express'
import cors from 'cors'
import path from 'path'
import { initDb } from './db.js'
import { requestIdMiddleware, errorHandler } from './error-middleware.js'
import { authRouter } from './auth.js'
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

initDb()

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(requestIdMiddleware)

app.use('/api/auth', authRouter)
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
app.use('/api', privacyRouter)
app.use('/api/terms', termsRouter)
app.use('/webhooks', webhooksRouter)

const uploadsDir = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadsDir))

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Archject API server running on http://localhost:${PORT}`)
})
