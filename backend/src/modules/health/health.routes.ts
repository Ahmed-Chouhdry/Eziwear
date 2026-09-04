import { Router } from 'express';
import { db } from '../../config/db.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/response.js';

export const healthRoutes = Router();

healthRoutes.get(
  '/health',
  asyncHandler(async (_req, res) => {
    let database = 'down';
    let latencyMs: number | null = null;
    try {
      const start = performance.now();
      await db.raw('select 1');
      latencyMs = Math.round(performance.now() - start);
      database = 'up';
    } catch {
      database = 'down';
    }

    ok(res, {
      status: database === 'up' ? 'ok' : 'degraded',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      database,
      dbLatencyMs: latencyMs,
    });
  }),
);
