import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { logger } from '../../config/logger.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/response.js';
import { mailConfigured, sendMail } from '../mail/mailer.js';
import { unsubscribeUrl } from '../mail/mail.routes.js';
import { offerMail } from '../mail/templates.js';

const sendOfferSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  headline: z.string().trim().min(3).max(120),
  message: z.string().trim().min(5).max(3000),
  couponCode: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  ctaLabel: z.string().trim().max(40).optional().or(z.literal('').transform(() => undefined)),
  ctaUrl: z.string().trim().url().max(300).optional().or(z.literal('').transform(() => undefined)),
  /** true → only send a preview to the signed-in admin. */
  testOnly: z.boolean().default(false),
});

/** Active customers who have not unsubscribed from offers. */
function audience() {
  return db('users').where({ role: 'customer', status: 'active', marketing_opt_out: false });
}

export const adminOfferRoutes = Router();
adminOfferRoutes.use('/admin/offers', authenticate, requireRole('admin'));

adminOfferRoutes.get(
  '/admin/offers/audience',
  asyncHandler(async (_req: Request, res: Response) => {
    const row = await audience().count<{ n: number }[]>({ n: '*' });
    const optedOut = await db('users')
      .where({ role: 'customer', marketing_opt_out: true })
      .count<{ n: number }[]>({ n: '*' });
    ok(res, {
      recipients: Number(row[0]?.n ?? 0),
      unsubscribed: Number(optedOut[0]?.n ?? 0),
      emailConfigured: mailConfigured,
    });
  }),
);

adminOfferRoutes.post(
  '/admin/offers/send',
  validate({ body: sendOfferSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!mailConfigured) throw ApiError.badRequest('Email (SMTP) is not configured on the server');
    const input = req.body as z.infer<typeof sendOfferSchema>;
    const { subject, headline, message, couponCode, ctaLabel, ctaUrl } = input;

    if (input.testOnly) {
      const me = await db('users').where({ id: req.user!.sub }).first('id', 'name', 'email');
      if (!me) throw ApiError.notFound('Admin not found');
      sendMail(
        offerMail({
          to: me.email,
          name: me.name,
          subject: `[TEST] ${subject}`,
          headline,
          message,
          couponCode,
          ctaLabel,
          ctaUrl,
          unsubscribeUrl: unsubscribeUrl(me.id),
        }),
      );
      ok(res, { queued: 1, test: true }, `Test email sent to ${me.email}`);
      return;
    }

    const users = await audience().select('id', 'name', 'email');
    if (users.length === 0) throw ApiError.badRequest('There are no customers to send to');

    // Send in the background, gently, so one request can't hammer the SMTP server.
    void (async () => {
      let n = 0;
      for (const u of users) {
        sendMail(
          offerMail({
            to: u.email,
            name: u.name,
            subject,
            headline,
            message,
            couponCode,
            ctaLabel,
            ctaUrl,
            unsubscribeUrl: unsubscribeUrl(u.id),
          }),
        );
        n += 1;
        await new Promise((r) => setTimeout(r, 300));
      }
      logger.info({ recipients: n, subject }, 'offer campaign finished');
    })();

    ok(res, { queued: users.length, test: false }, `Sending to ${users.length} customers`);
  }),
);
