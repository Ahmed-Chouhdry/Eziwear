import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../../config/db.js';
import { authenticate } from '../../middleware/auth.js';
import { validate } from '../../middleware/validate.js';
import { ApiError } from '../../utils/api-error.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { created, noContent, ok } from '../../utils/response.js';

function uid(req: Request): number {
  if (!req.user) throw ApiError.unauthorized();
  return req.user.sub;
}

const addSchema = z.object({ productId: z.coerce.number().int().positive() });
const productParam = z.object({ productId: z.coerce.number().int().positive() });
const mergeSchema = z.object({
  productIds: z.array(z.coerce.number().int().positive()).max(200),
});

interface WishlistItemDto {
  productId: number;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  salePrice: number | null;
  inStock: boolean;
}

async function listFor(userId: number): Promise<WishlistItemDto[]> {
  const rows = await db('wishlists as w')
    .join('products as p', 'p.id', 'w.product_id')
    .where('w.user_id', userId)
    .where('p.status', 'published')
    .orderBy('w.id', 'desc')
    .select('p.id as productId', 'p.name', 'p.slug', 'p.price', 'p.sale_price as salePrice')
    .select(
      db.raw(
        `(SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image`,
      ),
      db.raw(
        `EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.stock > 0) as inStock`,
      ),
    );

  type Raw = Omit<WishlistItemDto, 'inStock'> & { inStock: number };
  return (rows as Raw[]).map((r) => ({
    productId: r.productId,
    name: r.name,
    slug: r.slug,
    image: r.image,
    price: r.price,
    salePrice: r.salePrice,
    inStock: !!r.inStock,
  }));
}

export const wishlistRoutes = Router();
wishlistRoutes.use('/wishlist', authenticate);

wishlistRoutes.get(
  '/wishlist',
  asyncHandler(async (req: Request, res: Response) => {
    ok(res, await listFor(uid(req)));
  }),
);

wishlistRoutes.post(
  '/wishlist',
  validate({ body: addSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = uid(req);
    const product = await db('products')
      .where({ id: req.body.productId, status: 'published' })
      .first();
    if (!product) throw ApiError.notFound('Product not found');
    await db('wishlists')
      .insert({ user_id: userId, product_id: req.body.productId })
      .onConflict(['user_id', 'product_id'])
      .ignore();
    created(res, await listFor(userId), 'Saved to wishlist');
  }),
);

wishlistRoutes.delete(
  '/wishlist/:productId',
  validate({ params: productParam }),
  asyncHandler(async (req: Request, res: Response) => {
    await db('wishlists')
      .where({ user_id: uid(req), product_id: Number(req.params['productId']) })
      .del();
    noContent(res);
  }),
);

wishlistRoutes.post(
  '/wishlist/merge',
  validate({ body: mergeSchema }),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = uid(req);
    const ids: number[] = req.body.productIds;
    if (ids.length) {
      const valid = await db('products')
        .whereIn('id', ids)
        .where('status', 'published')
        .pluck('id');
      if (valid.length) {
        await db('wishlists')
          .insert(valid.map((id) => ({ user_id: userId, product_id: id })))
          .onConflict(['user_id', 'product_id'])
          .ignore();
      }
    }
    ok(res, await listFor(userId), 'Wishlist merged');
  }),
);
