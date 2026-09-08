import { z } from 'zod';

export const RETURN_REASONS = [
  'wrong_size',
  'wrong_item',
  'defective',
  'not_as_described',
  'changed_mind',
  'damaged_in_transit',
  'other',
] as const;

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const returnItemParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  itemId: z.coerce.number().int().positive(),
});
export const orderIdParamSchema = z.object({ orderId: z.coerce.number().int().positive() });

export const createReturnSchema = z.object({
  resolution_type: z.enum(['refund', 'exchange']),
  items: z
    .array(
      z.object({
        order_item_id: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().positive(),
        reason: z.enum(RETURN_REASONS),
        comment: z.string().trim().max(1000).optional(),
        photo_url: z.string().url().optional(),
      }),
    )
    .min(1, 'Select at least one item'),
});

export const cancelReturnSchema = z.object({});

export const adminListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
  status: z
    .enum([
      'requested',
      'approved',
      'rejected',
      'awaiting_pickup',
      'received',
      'inspected',
      'refunded',
      'exchanged',
      'closed',
      'cancelled',
    ])
    .optional(),
  search: z.string().trim().max(120).optional(),
  from: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
  to: z.string().datetime().optional().or(z.literal('').transform(() => undefined)),
});

export const rejectSchema = z.object({
  rejection_reason: z.string().trim().min(3).max(1000),
});

export const logisticsSchema = z.object({
  status: z.enum(['awaiting_pickup', 'received', 'inspected']),
  note: z.string().trim().max(1000).optional(),
});

export const inspectItemSchema = z.object({
  item_status: z.enum(['accepted', 'rejected']),
  condition_notes: z.string().trim().max(1000).optional(),
});

export const refundSchema = z.object({
  refund_method: z.enum(['store_credit', 'bank_transfer', 'original_payment']),
  refund_amount: z.coerce.number().nonnegative().optional(), // server computes the authoritative value
});

export const notesSchema = z.object({
  admin_notes: z.string().trim().max(4000),
});

export type CreateReturnInput = z.infer<typeof createReturnSchema>;
export type AdminListQuery = z.infer<typeof adminListQuerySchema>;
export type RejectInput = z.infer<typeof rejectSchema>;
export type LogisticsInput = z.infer<typeof logisticsSchema>;
export type InspectItemInput = z.infer<typeof inspectItemSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
