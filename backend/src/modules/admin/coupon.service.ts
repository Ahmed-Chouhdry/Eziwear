import { db } from '../../config/db.js';
import type { CouponRow } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate, type Paginated } from '../../utils/response.js';
import type { CouponListQuery, CreateCouponInput, UpdateCouponInput } from './coupon.schemas.js';

export interface AdminCouponDto {
  id: number;
  code: string;
  type: CouponRow['type'];
  value: number;
  minOrder: number | null;
  maxDiscount: number | null;
  startAt: string | null;
  endAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  status: CouponRow['status'];
  createdAt: string;
}

function dto(r: CouponRow): AdminCouponDto {
  return {
    id: r.id,
    code: r.code,
    type: r.type,
    value: Number(r.value),
    minOrder: r.min_order != null ? Number(r.min_order) : null,
    maxDiscount: r.max_discount != null ? Number(r.max_discount) : null,
    startAt: r.start_at,
    endAt: r.end_at,
    usageLimit: r.usage_limit,
    usedCount: r.used_count,
    status: r.status,
    createdAt: r.created_at,
  };
}

function assertValidPercentage(type: string, value: number): void {
  if (type === 'percentage' && value > 100) {
    throw ApiError.badRequest("Percentage value can't exceed 100");
  }
}

export const adminCouponService = {
  async list(q: CouponListQuery): Promise<Paginated<AdminCouponDto>> {
    const base = db('coupons');
    if (q.search) base.where('code', 'like', `%${q.search.toUpperCase()}%`);
    if (q.status) base.where('status', q.status);

    const countRow = await base.clone().count<{ n: number }[]>({ n: 'id' });
    const total = Number(countRow[0]?.n ?? 0);

    const rows = await base
      .clone()
      .orderBy('id', 'desc')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);

    return paginate((rows as CouponRow[]).map(dto), total, q.page, q.pageSize);
  },

  async create(input: CreateCouponInput): Promise<AdminCouponDto> {
    assertValidPercentage(input.type, input.value);
    const existing = await db('coupons').whereRaw('UPPER(code) = ?', [input.code]).first();
    if (existing) throw ApiError.conflict('A coupon with this code already exists');

    const [id] = await db('coupons').insert({
      code: input.code,
      type: input.type,
      value: input.value,
      min_order: input.minOrder ?? null,
      max_discount: input.maxDiscount ?? null,
      start_at: input.startAt ?? null,
      end_at: input.endAt ?? null,
      usage_limit: input.usageLimit ?? null,
      status: input.status,
    });
    const row = await db('coupons').where({ id }).first();
    return dto(row!);
  },

  async update(id: number, input: UpdateCouponInput): Promise<AdminCouponDto> {
    const existing = await db('coupons').where({ id }).first();
    if (!existing) throw ApiError.notFound('Coupon not found');

    if (input.code !== undefined && input.code !== existing.code) {
      const dup = await db('coupons').whereRaw('UPPER(code) = ?', [input.code]).whereNot({ id }).first();
      if (dup) throw ApiError.conflict('A coupon with this code already exists');
    }
    assertValidPercentage(input.type ?? existing.type, input.value ?? existing.value);

    const patch: Record<string, unknown> = {};
    if (input.code !== undefined) patch['code'] = input.code;
    if (input.type !== undefined) patch['type'] = input.type;
    if (input.value !== undefined) patch['value'] = input.value;
    if (input.minOrder !== undefined) patch['min_order'] = input.minOrder ?? null;
    if (input.maxDiscount !== undefined) patch['max_discount'] = input.maxDiscount ?? null;
    if (input.startAt !== undefined) patch['start_at'] = input.startAt ?? null;
    if (input.endAt !== undefined) patch['end_at'] = input.endAt ?? null;
    if (input.usageLimit !== undefined) patch['usage_limit'] = input.usageLimit ?? null;
    if (input.status !== undefined) patch['status'] = input.status;

    if (Object.keys(patch).length) await db('coupons').where({ id }).update(patch);
    const row = await db('coupons').where({ id }).first();
    return dto(row!);
  },

  async remove(id: number): Promise<void> {
    const existing = await db('coupons').where({ id }).first();
    if (!existing) throw ApiError.notFound('Coupon not found');
    await db('coupons').where({ id }).del();
  },
};
