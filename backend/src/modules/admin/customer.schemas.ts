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

export type CustomerListQuery = z.infer<typeof customerListQuerySchema>;
