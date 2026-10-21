import { z } from 'zod';

export const customerListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['active', 'suspended']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const updateCustomerStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

/** Standing discount: a percentage OR a flat Rs amount per order, not both. */
const discountFields = {
  discountPercent: z.coerce.number().min(0).max(90).default(0),
  discountAmount: z.coerce.number().min(0).max(1_000_000).default(0),
};
const eitherPercentOrAmount = (v: { discountPercent: number; discountAmount: number }) =>
  !(v.discountPercent > 0 && v.discountAmount > 0);
const eitherMsg = { message: 'Set a percentage or an amount, not both', path: ['discountAmount'] };

export const updateCustomerDiscountSchema = z.object(discountFields).refine(eitherPercentOrAmount, eitherMsg);

export const guestListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const updateGuestDiscountSchema = z
  .object({ email: z.string().trim().toLowerCase().email().max(160), ...discountFields })
  .refine(eitherPercentOrAmount, eitherMsg);

export type GuestListQuery = z.infer<typeof guestListQuerySchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
