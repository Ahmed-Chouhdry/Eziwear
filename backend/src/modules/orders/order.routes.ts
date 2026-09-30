import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, ok } from '../../utils/response.js';
import { authLimiter } from '../../middleware/rate-limit.js';
import {
  createGuestOrderSchema,
  createOrderSchema,
  guestOrderQuerySchema,
  orderNumberParamSchema,
} from './order.schemas.js';
import { orderService } from './order.service.js';

function uid(req: Request): number {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
}

export const orderRoutes = Router();

// Guest checkout — public, registered BEFORE the authenticate middleware below.
orderRoutes.post(
  '/orders/guest',
  authLimiter,
  validate({ body: createGuestOrderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await orderService.createGuest(req.body), 'Order placed');
  }),
);

orderRoutes.get(
  '/orders/guest/:orderNumber',
  validate({ params: orderNumberParamSchema, query: guestOrderQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(
      res,
      await orderService.getGuest(
        req.params['orderNumber'] as string,
        (req.query as unknown as { token: string }).token,
      ),
    );
  }),
);

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
