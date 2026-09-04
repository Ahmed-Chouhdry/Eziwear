import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, ok } from '../../utils/response.js';
import { createOrderSchema, orderNumberParamSchema } from './order.schemas.js';
import { orderService } from './order.service.js';

function uid(req: Request): number {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
}

export const orderRoutes = Router();
orderRoutes.use('/orders', authenticate);

orderRoutes.get(
  '/orders',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await orderService.list(uid(req)));
  }),
);

orderRoutes.post(
  '/orders',
  validate({ body: createOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await orderService.create(uid(req), req.body), 'Order placed');
  }),
);

orderRoutes.get(
  '/orders/:orderNumber',
  validate({ params: orderNumberParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await orderService.getByNumber(uid(req), req.params['orderNumber'] as string));
  }),
);
