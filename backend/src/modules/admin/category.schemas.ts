import { z } from 'zod';

const slug = z
  .string()
  .trim()
  .min(1)
  .max(140)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens');

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: slug.optional(),
  description: z.string().trim().max(500).optional().or(z.literal('').transform(() => undefined)),
  image: z.string().trim().url().max(500).optional().or(z.literal('').transform(() => undefined)),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const updateCategorySchema = createCategorySchema.partial();

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;
