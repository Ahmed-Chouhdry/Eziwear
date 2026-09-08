import { Router } from 'express';
import type { Request, Response } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, ok } from '../../utils/response.js';
import { returnService } from './return.service.js';
import {
  adminListQuerySchema,
  createReturnSchema,
  idParamSchema,
  inspectItemSchema,
  logisticsSchema,
  notesSchema,
  orderIdParamSchema,
  refundSchema,
  rejectSchema,
  returnItemParamSchema,
} from './return.schemas.js';

function uid(req: Request): number {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
}

// ---------------------------------------------------------------------------
// Customer
// ---------------------------------------------------------------------------
export const returnRoutes = Router();
returnRoutes.use(authenticate);

returnRoutes.get(
  '/orders/:orderId/return-eligibility',
  validate({ params: orderIdParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.eligibility(uid(req), Number(req.params['orderId'])));
  }),
);

returnRoutes.post(
  '/orders/:orderId/returns',
  validate({ params: orderIdParamSchema, body: createReturnSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    created(res, await returnService.create(uid(req), Number(req.params['orderId']), req.body), 'Return request created');
  }),
);

returnRoutes.get(
  '/returns',
  asyncHandler(async (req: Request, res: Response) => {
    const page = Number(req.query['page'] ?? 1);
    const pageSize = Number(req.query['pageSize'] ?? 20);
    ok(res, await returnService.listMine(uid(req), page, pageSize));
  }),
);

returnRoutes.get(
  '/returns/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.getMine(uid(req), Number(req.params['id'])));
  }),
);

returnRoutes.post(
  '/returns/:id/cancel',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.cancel(uid(req), Number(req.params['id'])), 'Return request cancelled');
  }),
);

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
export const adminReturnRoutes = Router();
adminReturnRoutes.use('/admin/returns', authenticate, requireRole('admin'));

adminReturnRoutes.get(
  '/admin/returns',
  validate({ query: adminListQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.adminList(req.query as never));
  }),
);

adminReturnRoutes.get(
  '/admin/returns/:id',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.adminGet(Number(req.params['id'])));
  }),
);

adminReturnRoutes.patch(
  '/admin/returns/:id/approve',
  validate({ params: idParamSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.approve(uid(req), Number(req.params['id'])), 'Return approved');
  }),
);

adminReturnRoutes.patch(
  '/admin/returns/:id/reject',
  validate({ params: idParamSchema, body: rejectSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.reject(uid(req), Number(req.params['id']), req.body), 'Return rejected');
  }),
);

adminReturnRoutes.patch(
  '/admin/returns/:id/logistics-status',
  validate({ params: idParamSchema, body: logisticsSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.logistics(uid(req), Number(req.params['id']), req.body));
  }),
);

adminReturnRoutes.patch(
  '/admin/returns/:id/items/:itemId/inspect',
  validate({ params: returnItemParamSchema, body: inspectItemSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(
      res,
      await returnService.inspectItem(
        uid(req),
        Number(req.params['id']),
        Number(req.params['itemId']),
        req.body,
      ),
    );
  }),
);

adminReturnRoutes.patch(
  '/admin/returns/:id/refund',
  validate({ params: idParamSchema, body: refundSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.refund(uid(req), Number(req.params['id']), req.body), 'Refund processed');
  }),
);

adminReturnRoutes.patch(
  '/admin/returns/:id/notes',
  validate({ params: idParamSchema, body: notesSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await returnService.setNotes(uid(req), Number(req.params['id']), req.body.admin_notes));
  }),
);
