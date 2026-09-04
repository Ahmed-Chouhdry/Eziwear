import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, noContent, ok } from '../../utils/response.js';
import { adminCouponService } from './coupon.service.js';
import { couponListQuerySchema, createCouponSchema, idParamSchema, updateCouponSchema } from './coupon.schemas.js';
import { adminReviewService } from './review.service.js';
import { adminReviewListQuerySchema, reviewIdParamSchema, updateReviewStatusSchema } from './review.schemas.js';

export const adminMarketingRoutes = Router();
adminMarketingRoutes.use('/admin/coupons', authenticate, requireRole('admin'));
adminMarketingRoutes.use('/admin/reviews', authenticate, requireRole('admin'));

// ---- Coupons ----
adminMarketingRoutes.get(
  '/admin/coupons',
  validate({ query: couponListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminCouponService.list(req.query as never));
  }),
);
adminMarketingRoutes.post(
  '/admin/coupons',
  validate({ body: createCouponSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await adminCouponService.create(req.body), 'Coupon created');
  }),
);
adminMarketingRoutes.patch(
  '/admin/coupons/:id',
  validate({ params: idParamSchema, body: updateCouponSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminCouponService.update(Number(req.params['id']), req.body), 'Coupon updated');
  }),
);
adminMarketingRoutes.delete(
  '/admin/coupons/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminCouponService.remove(Number(req.params['id']));
    noContent(res);
  }),
);

// ---- Reviews (moderation) ----
adminMarketingRoutes.get(
  '/admin/reviews',
  validate({ query: adminReviewListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminReviewService.list(req.query as never));
  }),
);
adminMarketingRoutes.patch(
  '/admin/reviews/:id/status',
  validate({ params: reviewIdParamSchema, body: updateReviewStatusSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminReviewService.updateStatus(Number(req.params['id']), req.body.status);
    ok(res, { updated: true }, 'Review status updated');
  }),
);
adminMarketingRoutes.delete(
  '/admin/reviews/:id',
  validate({ params: reviewIdParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminReviewService.remove(Number(req.params['id']));
    noContent(res);
  }),
);
