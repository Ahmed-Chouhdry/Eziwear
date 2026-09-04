import type { Request, Response } from 'express';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/response.js';
import { catalogService } from './catalog.service.js';
import type { ProductQuery } from './catalog.schemas.js';

export const catalogController = {
  categories: asyncHandler(async (_req: Request, res: Response) => {
    ok(res, await catalogService.categories());
  }),

  products: asyncHandler(async (req: Request, res: Response) => {
    const q = req.query as unknown as ProductQuery;
    ok(res, await catalogService.products(q));
  }),

  section: asyncHandler(async (req: Request, res: Response) => {
    const { section } = req.params as { section: string };
    const { limit } = req.query as unknown as { limit: number };
    ok(res, await catalogService.section(section, limit));
  }),

  productBySlug: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await catalogService.productBySlug(req.params['slug'] as string));
  }),

  related: asyncHandler(async (req: Request, res: Response) => {
    const { limit } = req.query as unknown as { limit: number };
    ok(res, await catalogService.related(req.params['slug'] as string, limit));
  }),

  filterOptions: asyncHandler(async (req: Request, res: Response) => {
    const category = typeof req.query['category'] === 'string' ? req.query['category'] : undefined;
    ok(res, await catalogService.filterOptions(category));
  }),
};
