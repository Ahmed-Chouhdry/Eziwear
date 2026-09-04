import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { cartController } from './cart.controller.js';
import {
  addItemSchema,
  cartLinesSchema,
  couponValidateSchema,
  itemParamSchema,
  updateItemSchema,
} from './cart.schemas.js';

export const cartRoutes = Router();

// Stateless helpers — available to guests
cartRoutes.post('/cart/validate', validate({ body: cartLinesSchema }), cartController.validate);
cartRoutes.post(
  '/cart/coupon/validate',
  validate({ body: couponValidateSchema }),
  cartController.validateCoupon,
);

// Server cart — logged-in customers only
cartRoutes.use('/cart', authenticate);
cartRoutes.get('/cart', cartController.get);
cartRoutes.delete('/cart', cartController.clear);
cartRoutes.post('/cart/items', validate({ body: addItemSchema }), cartController.addItem);
cartRoutes.patch(
  '/cart/items/:id',
  validate({ params: itemParamSchema, body: updateItemSchema }),
  cartController.updateItem,
);
cartRoutes.delete(
  '/cart/items/:id',
  validate({ params: itemParamSchema }),
  cartController.removeItem,
);
cartRoutes.post('/cart/merge', validate({ body: cartLinesSchema }), cartController.merge);
