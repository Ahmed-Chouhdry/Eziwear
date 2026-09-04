import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';
import type { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
import { cloudinary, cloudinaryConfigured } from '../../config/cloudinary.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { ApiError } from '../../utils/api-error.js';
import { created, ok } from '../../utils/response.js';
import { deleteUploadQuerySchema, uploadQuerySchema } from './upload.schemas.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only JPEG, PNG, WebP, GIF or AVIF images are allowed'));
  },
});

/** Adapts multer's callback-style error into the app's error-handling middleware. */
function single(fieldName: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    upload.single(fieldName)(req, res, (err: unknown) => {
      if (err) return next(ApiError.badRequest(err instanceof Error ? err.message : 'Invalid file'));
      next();
    });
  };
}

function uploadStream(buffer: Buffer, folder: string): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: `eziwear/${folder}`, resource_type: 'image' },
      (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
        if (error || !result) return reject(error ?? new Error('Upload failed'));
        resolve(result);
      },
    );
    stream.end(buffer);
  });
}

export const uploadRoutes = Router();
uploadRoutes.use('/admin/uploads', authenticate, requireRole('admin'));

uploadRoutes.post(
  '/admin/uploads',
  validate({ query: uploadQuerySchema }),
  single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!cloudinaryConfigured) throw ApiError.internal('Image upload is not configured');
    if (!req.file) throw ApiError.badRequest('No file uploaded');

    const { folder } = req.query as unknown as { folder: string };
    const result = await uploadStream(req.file.buffer, folder);
    created(res, { url: result.secure_url, publicId: result.public_id }, 'Image uploaded');
  }),
);

uploadRoutes.delete(
  '/admin/uploads',
  validate({ query: deleteUploadQuerySchema }),
  asyncHandler(async (req: Request, res: Response) => {
    if (!cloudinaryConfigured) throw ApiError.internal('Image upload is not configured');
    const { publicId } = req.query as unknown as { publicId: string };
    // Best-effort: an already-deleted or foreign public_id should not fail the request.
    await cloudinary.uploader.destroy(publicId).catch(() => undefined);
    ok(res, { deleted: true });
  }),
);
