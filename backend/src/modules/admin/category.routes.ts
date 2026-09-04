import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, noContent, ok } from '../../utils/response.js';
import { adminCategoryService } from './category.service.js';
import { createCategorySchema, idParamSchema, updateCategorySchema } from './category.schemas.js';

export const adminCategoryRoutes = Router();
adminCategoryRoutes.use('/admin/categories', authenticate, requireRole('admin'));

adminCategoryRoutes.get(
  '/admin/categories',
  asyncHandler(async (_req: Request, res: Response) => {
    ok(res, await adminCategoryService.list());
  }),
);

adminCategoryRoutes.post(
  '/admin/categories',
  validate({ body: createCategorySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await adminCategoryService.create(req.body), 'Category created');
  }),
);

adminCategoryRoutes.patch(
  '/admin/categories/:id',
  validate({ params: idParamSchema, body: updateCategorySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminCategoryService.update(Number(req.params['id']), req.body), 'Category updated');
  }),
);

adminCategoryRoutes.post(
  '/admin/categories/:id/move',
  validate({ params: idParamSchema, body: z.object({ direction: z.enum(['up', 'down']) }) }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminCategoryService.move(Number(req.params['id']), req.body.direction));
  }),
);

adminCategoryRoutes.delete(
  '/admin/categories/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminCategoryService.remove(Number(req.params['id']));
    noContent(res);
  }),
);
