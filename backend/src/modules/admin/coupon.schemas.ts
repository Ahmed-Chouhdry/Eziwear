import { z } from 'zod';

export const couponListQuerySchema = z.object({
  search: z.string().trim().max(80).optional(),
  status: z.enum(['active', 'inactive']).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });

const optionalDate = z
  .string()
  .trim()
  .optional()
  .transform((v, ctx) => {
    if (!v) return undefined;
    const ms = Date.parse(v);
    if (Number.isNaN(ms)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid date' });
      return z.NEVER;
    }
    return new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  });

const couponBase = z.object({
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .transform((v) => v.toUpperCase()),
  type: z.enum(['percentage', 'fixed']),
  value: z.coerce.number().positive(),
  minOrder: z.coerce.number().nonnegative().optional(),
  maxDiscount: z.coerce.number().positive().optional(),
  startAt: optionalDate,
  endAt: optionalDate,
  usageLimit: z.coerce.number().int().positive().optional(),
  status: z.enum(['active', 'inactive']).default('active'),
});

export const createCouponSchema = couponBase;
export const updateCouponSchema = couponBase.partial();

export type CouponListQuery = z.infer<typeof couponListQuerySchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
