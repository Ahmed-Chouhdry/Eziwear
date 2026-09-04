import type { Request, Response } from 'express';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/response.js';
import { cartService } from './cart.service.js';

function userId(req: Request): number {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
}

export const cartController = {
  get: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await cartService.get(userId(req)));
  }),

  addItem: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await cartService.addItem(userId(req), req.body), 'Added to cart', 201);
  }),

  updateItem: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params['id']);
    ok(res, await cartService.updateItem(userId(req), id, req.body.quantity));
  }),

  removeItem: asyncHandler(async (req: Request, res: Response) => {
    const id = Number(req.params['id']);
    ok(res, await cartService.removeItem(userId(req), id));
  }),

  clear: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await cartService.clear(userId(req)));
  }),

  merge: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await cartService.merge(userId(req), req.body.items), 'Cart merged');
  }),

  validate: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await cartService.validate(req.body.items));
  }),

  validateCoupon: asyncHandler(async (req: Request, res: Response) => {
    ok(res, await cartService.validateCoupon(req.body), 'Coupon applied');
  }),
};
