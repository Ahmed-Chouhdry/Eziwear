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

export const updateCustomerDiscountSchema = z.object({
  discountPercent: z.coerce.number().min(0).max(90),
});

export const guestListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const updateGuestDiscountSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(160),
  discountPercent: z.coerce.number().min(0).max(90),
});

export type GuestListQuery = z.infer<typeof guestListQuerySchema>;
export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
