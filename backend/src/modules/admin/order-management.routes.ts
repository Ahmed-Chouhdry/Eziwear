import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ok } from '../../utils/response.js';
import { adminOrderService } from './order.service.js';
import {
  orderListQuerySchema,
  orderNumberParamSchema,
  updateOrderStatusSchema,
  updatePaymentStatusSchema,
} from './order.schemas.js';
import { adminCustomerService } from './customer.service.js';
import {
  customerListQuerySchema,
  guestListQuerySchema,
  idParamSchema,
  updateCustomerDiscountSchema,
  updateCustomerStatusSchema,
  updateGuestDiscountSchema,
} from './customer.schemas.js';

function adminId(req: Request): number {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
}

export const adminOrderManagementRoutes = Router();
adminOrderManagementRoutes.use('/admin/orders', authenticate, requireRole('admin'));
adminOrderManagementRoutes.use('/admin/customers', authenticate, requireRole('admin'));
adminOrderManagementRoutes.use('/admin/guests', authenticate, requireRole('admin'));

// ---- Orders ----
adminOrderManagementRoutes.get(
  '/admin/orders',
  validate({ query: orderListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminOrderService.list(req.query as never));
  }),
);

adminOrderManagementRoutes.get(
  '/admin/orders/:orderNumber',
  validate({ params: orderNumberParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminOrderService.get(req.params['orderNumber'] as string));
  }),
);

adminOrderManagementRoutes.patch(
  '/admin/orders/:orderNumber/status',
  validate({ params: orderNumberParamSchema, body: updateOrderStatusSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(
      res,
      await adminOrderService.updateStatus(adminId(req), req.params['orderNumber'] as string, req.body),
      'Order status updated',
    );
  }),
);

adminOrderManagementRoutes.patch(
  '/admin/orders/:orderNumber/payment-status',
  validate({ params: orderNumberParamSchema, body: updatePaymentStatusSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(
      res,
      await adminOrderService.updatePaymentStatus(
        adminId(req),
        req.params['orderNumber'] as string,
        req.body.paymentStatus,
      ),
      'Payment status updated',
    );
  }),
);

// ---- Guests (checked out without an account) ----
adminOrderManagementRoutes.get(
  '/admin/guests',
  validate({ query: guestListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminCustomerService.listGuests(req.query as never));
  }),
);

adminOrderManagementRoutes.patch(
  '/admin/guests/discount',
  validate({ body: updateGuestDiscountSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminCustomerService.updateGuestDiscount(req.body.email, req.body.discountPercent);
    ok(res, { updated: true }, 'Guest discount updated');
  }),
);

// ---- Customers ----
adminOrderManagementRoutes.get(
  '/admin/customers',
  validate({ query: customerListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminCustomerService.list(req.query as never));
  }),
);

adminOrderManagementRoutes.get(
  '/admin/customers/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await adminCustomerService.get(Number(req.params['id'])));
  }),
);

adminOrderManagementRoutes.patch(
  '/admin/customers/:id/status',
  validate({ params: idParamSchema, body: updateCustomerStatusSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminCustomerService.updateStatus(Number(req.params['id']), req.body.status);
    ok(res, { updated: true }, 'Customer status updated');
  }),
);

adminOrderManagementRoutes.patch(
  '/admin/customers/:id/discount',
  validate({ params: idParamSchema, body: updateCustomerDiscountSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    await adminCustomerService.updateDiscount(Number(req.params['id']), req.body.discountPercent);
    ok(res, { updated: true }, 'Customer discount updated');
  }),
);
