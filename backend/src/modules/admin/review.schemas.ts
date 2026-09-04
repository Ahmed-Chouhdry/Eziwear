import { z } from 'zod';

export const adminReviewListQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const reviewIdParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const updateReviewStatusSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export type AdminReviewListQuery = z.infer<typeof adminReviewListQuerySchema>;
