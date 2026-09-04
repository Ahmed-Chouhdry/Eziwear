import { z } from 'zod';

/** One Cloudinary sub-folder per content type — keeps the media library organised. */
export const uploadQuerySchema = z.object({
  folder: z.enum(['products', 'categories', 'sliders', 'ads']).default('products'),
});

export const deleteUploadQuerySchema = z.object({
  publicId: z.string().trim().min(1).max(300),
});

export type UploadQuery = z.infer<typeof uploadQuerySchema>;
