import { z } from 'zod';

const csv = z
  .string()
  .transform((s) => s.split(',').map((v) => v.trim()).filter(Boolean))
  .pipe(z.array(z.string()).min(1))
  .optional();

export const productQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sizes: csv,
  colors: csv,
  inStock: z
    .enum(['true', 'false', '1', '0'])
    .transform((v) => v === 'true' || v === '1')
    .optional(),
  sort: z.enum(['newest', 'price-asc', 'price-desc', 'popular']).default('newest'),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(48).default(12),
});

export const sectionParamSchema = z.object({
  section: z.enum(['new-arrivals', 'featured', 'vip', 'best-sellers', 'sale']),
});

export const sectionQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(24).default(8),
});

export const slugParamSchema = z.object({
  slug: z.string().trim().min(1).max(200),
});

export type ProductQuery = z.infer<typeof productQuerySchema>;
