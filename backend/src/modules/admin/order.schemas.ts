import { z } from 'zod';

export const orderListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z
    .enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .optional(),
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const orderNumberParamSchema = z.object({ orderNumber: z.string().trim().min(3).max(32) });

export const updateOrderStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned']),
  note: z.string().trim().max(255).optional(),
});

export const updatePaymentStatusSchema = z.object({
  paymentStatus: z.enum(['pending', 'paid', 'failed', 'refunded']),
});

/** Admin sets the order's total discount either as a Rs amount or as a % of the subtotal. */
export const updateOrderDiscountSchema = z.object({
  mode: z.enum(['amount', 'percent']),
  value: z.coerce.number().min(0),
  note: z.string().trim().max(255).optional(),
});

export type UpdateOrderDiscountInput = z.infer<typeof updateOrderDiscountSchema>;
export type OrderListQuery = z.infer<typeof orderListQuerySchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
