import { z } from 'zod';

const slug = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens');

const money = z.coerce.number().nonnegative().max(10_000_000);

const variant = z.object({
  id: z.coerce.number().int().positive().optional(),
  size: z.string().trim().min(1).max(40),
  color: z.string().trim().min(1).max(60),
  colorHex: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Enter a hex colour like #0B0B0D')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  stock: z.coerce.number().int().min(0).max(100_000),
  sku: z.string().trim().min(1).max(80),
});

const image = z.object({
  imageUrl: z.string().trim().url().max(500),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

export const productListQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  category: z.string().trim().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: slug.optional(),
  description: z.string().trim().max(5000).optional().or(z.literal('').transform(() => undefined)),
  sku: z.string().trim().min(1).max(60),
  categoryId: z.coerce.number().int().positive(),
  price: money,
  salePrice: money.optional().nullable(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  isNewArrival: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  isVip: z.boolean().default(false),
  images: z.array(image).max(12).default([]),
  variants: z.array(variant.omit({ id: true })).max(60).default([]),
});

export const updateProductSchema = createProductSchema
  .omit({ images: true, variants: true })
  .partial()
  .extend({ name: z.string().trim().min(2).max(180).optional() });

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

export const imagesSchema = z.object({ images: z.array(image).max(12) });
export const variantCreateSchema = variant.omit({ id: true });
export const variantUpdateSchema = variant.omit({ id: true }).partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
