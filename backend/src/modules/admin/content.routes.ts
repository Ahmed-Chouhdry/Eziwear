import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, noContent, ok } from '../../utils/response.js';
import { adminAdService, adminSliderService, adminSocialLinkService } from './content.service.js';
import {
  createAdSchema,
  createSliderSchema,
  createSocialLinkSchema,
  idParamSchema,
  moveBodySchema,
  updateAdSchema,
  updateSliderSchema,
  updateSocialLinkSchema,
} from './content.schemas.js';

export const adminContentRoutes = Router();
adminContentRoutes.use('/admin/sliders', authenticate, requireRole('admin'));
adminContentRoutes.use('/admin/advertisements', authenticate, requireRole('admin'));
adminContentRoutes.use('/admin/social-links', authenticate, requireRole('admin'));

// ---- Sliders ----
adminContentRoutes.get(
  '/admin/sliders',
  asyncHandler(async (_req: Request, res: Response) => {
    ok(res, await adminSliderService.list());
  }),
);
adminContentRoutes.post(
  '/admin/sliders',
  validate({ body: createSliderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await adminSliderService.create(req.body), 'Slider created');
  }),
);
adminContentRoutes.patch(
  '/admin/sliders/:id',
  validate({ params: idParamSchema, body: updateSliderSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminSliderService.update(Number(req.params['id']), req.body), 'Slider updated');
  }),
);
adminContentRoutes.post(
  '/admin/sliders/:id/move',
  validate({ params: idParamSchema, body: moveBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminSliderService.move(Number(req.params['id']), req.body.direction));
  }),
);
adminContentRoutes.delete(
  '/admin/sliders/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminSliderService.remove(Number(req.params['id']));
    noContent(res);
  }),
);

// ---- Advertisements ----
adminContentRoutes.get(
  '/admin/advertisements',
  asyncHandler(async (_req: Request, res: Response) => {
    ok(res, await adminAdService.list());
  }),
);
adminContentRoutes.post(
  '/admin/advertisements',
  validate({ body: createAdSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await adminAdService.create(req.body), 'Advertisement created');
  }),
);
adminContentRoutes.patch(
  '/admin/advertisements/:id',
  validate({ params: idParamSchema, body: updateAdSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminAdService.update(Number(req.params['id']), req.body), 'Advertisement updated');
  }),
);
adminContentRoutes.delete(
  '/admin/advertisements/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminAdService.remove(Number(req.params['id']));
    noContent(res);
  }),
);

// ---- Social links ----
adminContentRoutes.get(
  '/admin/social-links',
  asyncHandler(async (_req: Request, res: Response) => {
    ok(res, await adminSocialLinkService.list());
  }),
);
adminContentRoutes.post(
  '/admin/social-links',
  validate({ body: createSocialLinkSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await adminSocialLinkService.create(req.body), 'Social link created');
  }),
);
adminContentRoutes.patch(
  '/admin/social-links/:id',
  validate({ params: idParamSchema, body: updateSocialLinkSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminSocialLinkService.update(Number(req.params['id']), req.body), 'Social link updated');
  }),
);
adminContentRoutes.post(
  '/admin/social-links/:id/move',
  validate({ params: idParamSchema, body: moveBodySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminSocialLinkService.move(Number(req.params['id']), req.body.direction));
  }),
);
adminContentRoutes.delete(
  '/admin/social-links/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminSocialLinkService.remove(Number(req.params['id']));
    noContent(res);
  }),
);
