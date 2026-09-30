import { z } from 'zod';

const inlineAddress = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{7,20}$/, 'Enter a valid phone number'),
  address: z.string().trim().min(5).max(255),
  city: z.string().trim().min(2).max(100),
  area: z.string().trim().max(100).optional().or(z.literal('').transform(() => undefined)),
  postalCode: z.string().trim().max(20).optional().or(z.literal('').transform(() => undefined)),
  saveAddress: z.boolean().optional(),
});

export const createOrderSchema = z
  .object({
    addressId: z.coerce.number().int().positive().optional(),
    address: inlineAddress.optional(),
    shippingMethod: z.enum(['standard']).default('standard'),
    paymentMethod: z.enum(['cod']).default('cod'),
    couponCode: z.string().trim().min(1).max(40).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.addressId != null || v.address != null, {
    message: 'A shipping address is required',
    path: ['address'],
  });

export const createGuestOrderSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email').max(160),
  address: inlineAddress,
  items: z
    .array(
      z.object({
        variantId: z.coerce.number().int().positive(),
        quantity: z.coerce.number().int().min(1).max(20),
      }),
    )
    .min(1, 'Your cart is empty')
    .max(50),
  shippingMethod: z.enum(['standard']).default('standard'),
  paymentMethod: z.enum(['cod']).default('cod'),
  couponCode: z.string().trim().min(1).max(40).optional(),
  notes: z.string().trim().max(500).optional(),
});

export const guestOrderQuerySchema = z.object({
  token: z.string().trim().min(16).max(64),
});

export const orderNumberParamSchema = z.object({
  orderNumber: z.string().trim().min(3).max(32),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreateGuestOrderInput = z.infer<typeof createGuestOrderSchema>;
