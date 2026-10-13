import { createHmac, timingSafeEqual } from 'node:crypto';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { env } from '../../config/env.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';

function sign(userId: number): string {
  return createHmac('sha256', env.JWT_SECRET).update(`unsubscribe:${userId}`).digest('hex').slice(0, 32);
}

/** Public link placed at the bottom of every offer email. */
export function unsubscribeUrl(userId: number): string {
  // Points at the API; the browser shows a tiny confirmation page.
  const base = env.PUBLIC_API_URL ?? `http://localhost:${env.PORT}`;
  return `${base}/api/v1/mail/unsubscribe?u=${userId}&t=${sign(userId)}`;
}

const querySchema = z.object({
  u: z.coerce.number().int().positive(),
  t: z.string().min(16).max(64),
});

export const mailRoutes = Router();

mailRoutes.get(
  '/mail/unsubscribe',
  validate({ query: querySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const { u, t } = req.query as unknown as z.infer<typeof querySchema>;
    const expected = Buffer.from(sign(u));
    const given = Buffer.from(t);
    const valid = expected.length === given.length && timingSafeEqual(expected, given);

    if (valid) await db('users').where({ id: u }).update({ marketing_opt_out: true });

    res
      .status(valid ? 200 : 400)
      .type('html')
      .send(
        `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<body style="font-family:Arial,sans-serif;max-width:480px;margin:15vh auto;padding:0 20px;text-align:center">
<h1 style="margin-bottom:8px">${valid ? "You're unsubscribed" : 'Invalid link'}</h1>
<p style="color:#555">${
          valid
            ? "You won't receive EZiWear offer emails any more. You will still get emails about your orders."
            : 'This unsubscribe link is not valid.'
        }</p>
<p><a href="${env.APP_URL}" style="color:#FF6A00">Back to EZiWear</a></p></body>`,
      );
  }),
);
