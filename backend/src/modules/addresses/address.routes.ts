import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, noContent, ok } from '../../utils/response.js';
import { addressBodySchema, addressParamSchema } from './address.schemas.js';
import { addressService } from './address.service.js';

function uid(req: Request): number {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
}

export const addressRoutes = Router();
addressRoutes.use('/addresses', authenticate);

addressRoutes.get(
  '/addresses',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await addressService.list(uid(req)));
  }),
);

addressRoutes.post(
  '/addresses',
  validate({ body: addressBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await addressService.create(uid(req), req.body));
  }),
);

addressRoutes.patch(
  '/addresses/:id',
  validate({ params: addressParamSchema, body: addressBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await addressService.update(uid(req), Number(req.params['id']), req.body));
  }),
);

addressRoutes.delete(
  '/addresses/:id',
  validate({ params: addressParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await addressService.remove(uid(req), Number(req.params['id']));
    noContent(res);
  }),
);
