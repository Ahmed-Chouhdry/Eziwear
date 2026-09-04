import { z } from 'zod';

export const addressBodySchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().regex(/^[0-9+()\-\s]{7,20}$/, 'Enter a valid phone number'),
  address: z.string().trim().min(5).max(255),
  city: z.string().trim().min(2).max(100),
  area: z.string().trim().max(100).optional().or(z.literal('').transform(() => undefined)),
  postalCode: z.string().trim().max(20).optional().or(z.literal('').transform(() => undefined)),
  isDefault: z.boolean().optional(),
});

export const addressParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type AddressBody = z.infer<typeof addressBodySchema>;
