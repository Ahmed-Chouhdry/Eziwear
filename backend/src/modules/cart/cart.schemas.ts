import { z } from 'zod';

const lineItem = z.object({
  variantId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().int().min(1).max(99),
});

export const addItemSchema = lineItem;

export const updateItemSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
});

export const itemParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const cartLinesSchema = z.object({
  items: z.array(lineItem).max(50),
});

export const couponValidateSchema = z.object({
  code: z.string().trim().min(1).max(40).toUpperCase(),
  items: z.array(lineItem).max(50),
});

export type LineItemInput = z.infer<typeof lineItem>;
export type CouponValidateInput = z.infer<typeof couponValidateSchema>;
