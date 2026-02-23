import { Router } from 'express';
import { db } from './db.js';
/** SendGrid event webhook - handles delivered, open, click, bounce, blocked */
export const webhooksRouter = Router();
webhooksRouter.post('/sendgrid', (req, res) => {
    res.status(200).send();
    const events = req.body;
    const list = Array.isArray(events) ? events : [events];
    for (const ev of list) {
        if (ev.event === 'bounce' || ev.event === 'blocked' || ev.event === 'dropped') {
            try {
                db.prepare(`UPDATE users SET verification_attempts_count = verification_attempts_count + 1 
           WHERE email = ? AND email_verified = 0`).run(ev.email);
            }
            catch (err) {
                console.error('[Webhook] Error updating bounce status:', err);
            }
        }
    }
});
