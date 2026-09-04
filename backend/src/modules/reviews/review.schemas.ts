import { z } from 'zod';

export const reviewListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(10),
});

export const createReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

export type ReviewListQuery = z.infer<typeof reviewListQuerySchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
