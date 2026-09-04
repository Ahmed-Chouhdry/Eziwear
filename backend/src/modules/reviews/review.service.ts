import { db } from '../../config/db.js';
import type { ReviewRow } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate, type Paginated } from '../../utils/response.js';
import type { CreateReviewInput, ReviewListQuery } from './review.schemas.js';

export interface ReviewDto {
  id: number;
  rating: number;
  comment: string | null;
  status: ReviewRow['status'];
  reviewerName: string;
  createdAt: string;
}

/** "Ahmed Khan" -> "Ahmed K." — keeps reviewer names public-friendly. */
function displayName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ?? 'Customer';
  return `${parts[0]} ${parts[parts.length - 1]!.charAt(0)}.`;
}

async function findProductBySlug(slug: string) {
  const product = await db('products').where({ slug }).first();
  if (!product) throw ApiError.notFound('Product not found');
  return product;
}

async function hasDeliveredPurchase(userId: number, productId: number): Promise<boolean> {
  const row = await db('orders as o')
    .join('order_items as oi', 'oi.order_id', 'o.id')
    .where('o.user_id', userId)
    .where('o.order_status', 'delivered')
    .where('oi.product_id', productId)
    .first();
  return !!row;
}

function toDto(row: ReviewRow & { userName: string }): ReviewDto {
  return {
    id: row.id,
    rating: row.rating,
    comment: row.comment,
    status: row.status,
    reviewerName: displayName(row.userName),
    createdAt: row.created_at,
  };
}

export const reviewService = {
  async listApproved(slug: string, q: ReviewListQuery): Promise<Paginated<ReviewDto>> {
    const product = await findProductBySlug(slug);
    const base = db('reviews as r')
      .join('users as u', 'u.id', 'r.user_id')
      .where('r.product_id', product.id)
      .where('r.status', 'approved');

    const countRow = await base.clone().count<{ n: number }[]>({ n: 'r.id' });
    const total = Number(countRow[0]?.n ?? 0);

    const rows = await base
      .clone()
      .orderBy('r.id', 'desc')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize)
      .select('r.*', 'u.name as userName');

    return paginate((rows as (ReviewRow & { userName: string })[]).map(toDto), total, q.page, q.pageSize);
  },

  async mine(slug: string, userId: number): Promise<{ eligible: boolean; review: ReviewDto | null }> {
    const product = await findProductBySlug(slug);
    const [eligible, existing] = await Promise.all([
      hasDeliveredPurchase(userId, product.id),
      db('reviews as r')
        .join('users as u', 'u.id', 'r.user_id')
        .where({ 'r.user_id': userId, 'r.product_id': product.id })
        .select('r.*', 'u.name as userName')
        .first(),
    ]);
    return { eligible, review: existing ? toDto(existing) : null };
  },

  async submit(slug: string, userId: number, input: CreateReviewInput): Promise<ReviewDto> {
    const product = await findProductBySlug(slug);
    if (!(await hasDeliveredPurchase(userId, product.id))) {
      throw ApiError.forbidden('You can review a product once your order for it has been delivered');
    }

    const existing = await db('reviews').where({ user_id: userId, product_id: product.id }).first();
    if (existing) {
      // Editing a review re-queues it for moderation.
      await db('reviews')
        .where({ id: existing.id })
        .update({ rating: input.rating, comment: input.comment ?? null, status: 'pending' });
    } else {
      await db('reviews').insert({
        user_id: userId,
        product_id: product.id,
        rating: input.rating,
        comment: input.comment ?? null,
        status: 'pending',
      });
    }

    const row = await db('reviews as r')
      .join('users as u', 'u.id', 'r.user_id')
      .where({ 'r.user_id': userId, 'r.product_id': product.id })
      .select('r.*', 'u.name as userName')
      .first();
    return toDto(row!);
  },
};
