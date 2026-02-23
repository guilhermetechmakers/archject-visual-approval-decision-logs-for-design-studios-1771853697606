import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDb } from './db.js';
import { authRouter } from './auth.js';
import { webhooksRouter } from './webhooks.js';
import { billingRouter } from './billing.js';
import { adminRouter } from './admin.js';
import { analyticsRouter } from './analytics.js';
import { helpRouter } from './help.js';
initDb();
const app = express();
const PORT = process.env.PORT ?? 3001;
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.use('/api', analyticsRouter);
app.use('/api', billingRouter);
app.use('/api', helpRouter);
app.use('/webhooks', webhooksRouter);
const uploadsDir = path.join(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));
app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
});
app.listen(PORT, () => {
    console.log(`Archject API server running on http://localhost:${PORT}`);
});
