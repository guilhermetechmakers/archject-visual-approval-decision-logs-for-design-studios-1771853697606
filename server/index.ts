import express from 'express'
import cors from 'cors'
import { initDb } from './db.js'
import { authRouter } from './auth.js'
import { webhooksRouter } from './webhooks.js'
import { billingRouter } from './billing.js'

initDb()

const app = express()
const PORT = process.env.PORT ?? 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())

app.use('/api/auth', authRouter)
app.use('/api', billingRouter)
app.use('/webhooks', webhooksRouter)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`Archject API server running on http://localhost:${PORT}`)
})
