import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, ok } from '../../utils/response.js';
import { adminProductService } from './product.service.js';
import {
  createProductSchema,
  idParamSchema,
  imagesSchema,
  productListQuerySchema,
  updateProductSchema,
  variantCreateSchema,
  variantUpdateSchema,
} from './product.schemas.js';
import { z } from 'zod';

export const adminProductRoutes = Router();
adminProductRoutes.use('/admin/products', authenticate, requireRole('admin'));
adminProductRoutes.use('/admin/variants', authenticate, requireRole('admin'));

adminProductRoutes.get(
  '/admin/products',
  validate({ query: productListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminProductService.list(req.query as never));
  }),
);

adminProductRoutes.post(
  '/admin/products',
  validate({ body: createProductSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await adminProductService.create(req.body), 'Product created');
  }),
);

adminProductRoutes.get(
  '/admin/products/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminProductService.get(Number(req.params['id'])));
  }),
);

adminProductRoutes.patch(
  '/admin/products/:id',
  validate({ params: idParamSchema, body: updateProductSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminProductService.update(Number(req.params['id']), req.body), 'Product updated');
  }),
);

adminProductRoutes.put(
  '/admin/products/:id/images',
  validate({ params: idParamSchema, body: imagesSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminProductService.replaceImages(Number(req.params['id']), req.body.images), 'Images updated');
  }),
);

adminProductRoutes.post(
  '/admin/products/:id/variants',
  validate({ params: idParamSchema, body: variantCreateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await adminProductService.addVariant(Number(req.params['id']), req.body), 'Variant added');
  }),
);

adminProductRoutes.delete(
  '/admin/products/:id',
  validate({ params: idParamSchema, query: z.object({ hard: z.coerce.boolean().optional() }) }),
  asyncHandler(async (req: Request, res: Response) => {
    if ((req.query['hard'] as unknown) === true) {
      ok(res, await adminProductService.remove(Number(req.params['id'])), 'Product deleted');
    } else {
      await adminProductService.archive(Number(req.params['id']));
      ok(res, { archived: true }, 'Product archived');
    }
  }),
);

adminProductRoutes.patch(
  '/admin/variants/:id',
  validate({ params: idParamSchema, body: variantUpdateSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminProductService.updateVariant(Number(req.params['id']), req.body), 'Variant updated');
  }),
);

adminProductRoutes.delete(
  '/admin/variants/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminProductService.deleteVariant(Number(req.params['id']));
    ok(res, { deleted: true });
  }),
);
