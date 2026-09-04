import { db } from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate, type Paginated } from '../../utils/response.js';
import type { AdminReviewListQuery } from './review.schemas.js';

export interface AdminReviewListItem {
  id: number;
  rating: number;
  comment: string | null;
  status: 'pending' | 'approved' | 'rejected';
  customerName: string;
  productName: string;
  productSlug: string;
  createdAt: string;
}

export const adminReviewService = {
  async list(q: AdminReviewListQuery): Promise<Paginated<AdminReviewListItem>> {
    const base = db('reviews as r')
      .join('users as u', 'u.id', 'r.user_id')
      .join('products as p', 'p.id', 'r.product_id');
    if (q.status) base.where('r.status', q.status);
    if (q.search) {
      base.where((b) => b.where('u.name', 'like', `%${q.search}%`).orWhere('p.name', 'like', `%${q.search}%`));
    }

    const countRow = await base.clone().count<{ n: number }[]>({ n: 'r.id' });
    const total = Number(countRow[0]?.n ?? 0);

    const rows = await base
      .clone()
      .orderBy('r.id', 'desc')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize)
      .select(
        'r.id',
        'r.rating',
        'r.comment',
        'r.status',
        'r.created_at as createdAt',
        'u.name as customerName',
        'p.name as productName',
        'p.slug as productSlug',
      );

    return paginate(rows as AdminReviewListItem[], total, q.page, q.pageSize);
  },

  async updateStatus(id: number, status: 'approved' | 'rejected'): Promise<void> {
    const existing = await db('reviews').where({ id }).first();
    if (!existing) throw ApiError.notFound('Review not found');
    await db('reviews').where({ id }).update({ status });
  },

  async remove(id: number): Promise<void> {
    const existing = await db('reviews').where({ id }).first();
    if (!existing) throw ApiError.notFound('Review not found');
    await db('reviews').where({ id }).del();
  },
};
