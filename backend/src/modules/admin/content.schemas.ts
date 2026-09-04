import { z } from 'zod';

const url = z.string().trim().url().max(500);
const optionalUrl = url.optional().or(z.literal('').transform(() => undefined));
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal('').transform(() => undefined));
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

export const createSliderSchema = z.object({
  title: optionalText(180),
  subtitle: optionalText(255),
  imageUrl: url,
  imageUrlMobile: optionalUrl,
  buttonText: optionalText(60),
  buttonLink: optionalText(255),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
});
export const updateSliderSchema = createSliderSchema.partial();

export const createAdSchema = z.object({
  title: optionalText(180),
  description: optionalText(500),
  mediaUrl: url,
  ctaText: optionalText(60),
  ctaLink: optionalText(255),
  position: z.enum(['hero', 'homepage_banner', 'popup', 'category']).default('homepage_banner'),
  startAt: optionalDate,
  endAt: optionalDate,
  status: z.enum(['active', 'inactive']).default('active'),
});
export const updateAdSchema = createAdSchema.partial();

export const createSocialLinkSchema = z.object({
  platform: z.string().trim().min(1).max(40),
  url,
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(['active', 'inactive']).default('active'),
});
export const updateSocialLinkSchema = createSocialLinkSchema.partial();

export const idParamSchema = z.object({ id: z.coerce.number().int().positive() });
export const moveBodySchema = z.object({ direction: z.enum(['up', 'down']) });

export type CreateSliderInput = z.infer<typeof createSliderSchema>;
export type UpdateSliderInput = z.infer<typeof updateSliderSchema>;
export type CreateAdInput = z.infer<typeof createAdSchema>;
export type UpdateAdInput = z.infer<typeof updateAdSchema>;
export type CreateSocialLinkInput = z.infer<typeof createSocialLinkSchema>;
export type UpdateSocialLinkInput = z.infer<typeof updateSocialLinkSchema>;
