import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, ok } from '../../utils/response.js';
import { slugParamSchema } from '../catalog/catalog.schemas.js';
import { reviewService } from './review.service.js';
import { createReviewSchema, reviewListQuerySchema } from './review.schemas.js';

export const reviewRoutes = Router();

reviewRoutes.get(
  '/products/:slug/reviews',
  validate({ params: slugParamSchema, query: reviewListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await reviewService.listApproved(req.params['slug'] as string, req.query as never));
  }),
);

reviewRoutes.get(
  '/products/:slug/reviews/mine',
  authenticate,
  validate({ params: slugParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await reviewService.mine(req.params['slug'] as string, req.user!.sub));
  }),
);

reviewRoutes.post(
  '/products/:slug/reviews',
  authenticate,
  validate({ params: slugParamSchema, body: createReviewSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(
      res,
      await reviewService.submit(req.params['slug'] as string, req.user!.sub, req.body),
      'Review submitted for moderation',
    );
  }),
);
