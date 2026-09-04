import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/response.js';
import { adminService } from './admin.service.js';

export const adminRoutes = Router();

// Every /admin route requires an authenticated admin.
adminRoutes.use('/admin', authenticate, requireRole('admin'));

adminRoutes.get(
  '/admin/stats',
  asyncHandler(async (_req: Request, res: Response) => {
    ok(res, await adminService.stats());
  }),
);

adminRoutes.get(
  '/admin/stats/sales',
  validate({ query: z.object({ days: z.coerce.number().int().min(7).max(90).default(14) }) }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminService.salesSeries(Number(req.query['days'] ?? 14)));
  }),
);

adminRoutes.get(
  '/admin/orders/recent',
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(20).default(8) }) }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminService.recentOrders(Number(req.query['limit'] ?? 8)));
  }),
);

adminRoutes.get(
  '/admin/inventory/low-stock',
  validate({ query: z.object({ limit: z.coerce.number().int().min(1).max(50).default(20) }) }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminService.lowStock(Number(req.query['limit'] ?? 20)));
  }),
);
