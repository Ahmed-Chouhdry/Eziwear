import type { Knex } from 'knex';
import { db } from '../../config/db.js';
import type { CategoryRow } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import type { CreateCategoryInput, UpdateCategoryInput } from './category.schemas.js';

export interface AdminCategoryDto {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  status: 'active' | 'inactive';
  productCount: number;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueSlug(base: string, ignoreId?: number, trx?: Knex): Promise<string> {
  const q = trx ?? db;
  let candidate = base || 'category';
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await q('categories')
      .where({ slug: candidate })
      .modify((b) => ignoreId && b.whereNot({ id: ignoreId }))
      .first();
    if (!row) return candidate;
    candidate = `${base}-${++n}`;
  }
}

function toDto(row: CategoryRow, productCount: number): AdminCategoryDto {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    image: row.image,
    sortOrder: row.sort_order,
    status: row.status,
    productCount,
  };
}

async function withCounts(rows: CategoryRow[]): Promise<AdminCategoryDto[]> {
  if (rows.length === 0) return [];
  const counts = await db('products')
    .whereIn(
      'category_id',
      rows.map((r) => r.id),
    )
    .groupBy('category_id')
    .select('category_id')
    .count<{ category_id: number; c: number }[]>({ c: '*' });
  const byId = new Map(counts.map((c) => [c.category_id, Number(c.c)]));
  return rows.map((r) => toDto(r, byId.get(r.id) ?? 0));
}

export const adminCategoryService = {
  async list(): Promise<AdminCategoryDto[]> {
    const rows = await db('categories').orderBy('sort_order', 'asc').orderBy('name', 'asc');
    return withCounts(rows);
  },

  async create(input: CreateCategoryInput): Promise<AdminCategoryDto> {
    const slug = await uniqueSlug(input.slug ?? slugify(input.name));
    let sortOrder = input.sortOrder;
    if (!sortOrder) {
      const max = await db('categories').max<{ m: number | null }[]>({ m: 'sort_order' });
      sortOrder = (max[0]?.m ?? -1) + 1;
    }
    const [id] = await db('categories').insert({
      name: input.name,
      slug,
      description: input.description ?? null,
      image: input.image ?? null,
      sort_order: sortOrder,
      status: input.status,
    });
    const row = await db('categories').where({ id }).first();
    return toDto(row!, 0);
  },

  async update(id: number, input: UpdateCategoryInput): Promise<AdminCategoryDto> {
    const existing = await db('categories').where({ id }).first();
    if (!existing) throw ApiError.notFound('Category not found');

    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch['name'] = input.name;
    if (input.slug !== undefined) patch['slug'] = await uniqueSlug(input.slug, id);
    if (input.description !== undefined) patch['description'] = input.description ?? null;
    if (input.image !== undefined) patch['image'] = input.image ?? null;
    if (input.sortOrder !== undefined) patch['sort_order'] = input.sortOrder;
    if (input.status !== undefined) patch['status'] = input.status;

    if (Object.keys(patch).length) await db('categories').where({ id }).update(patch);
    const row = await db('categories').where({ id }).first();
    const count = await db('products').where({ category_id: id }).count<{ c: number }[]>({ c: '*' });
    return toDto(row!, Number(count[0]?.c ?? 0));
  },

  async remove(id: number): Promise<void> {
    const existing = await db('categories').where({ id }).first();
    if (!existing) throw ApiError.notFound('Category not found');
    const inUse = await db('products').where({ category_id: id }).first();
    if (inUse) {
      throw ApiError.conflict(
        'This category has products in it — move or delete them first, or disable the category instead',
      );
    }
    await db('categories').where({ id }).del();
  },

  /** Swap sort_order between two adjacent categories. */
  async move(id: number, direction: 'up' | 'down'): Promise<AdminCategoryDto[]> {
    const rows = await db('categories').orderBy('sort_order', 'asc').orderBy('id', 'asc');
    const idx = rows.findIndex((r) => r.id === id);
    if (idx === -1) throw ApiError.notFound('Category not found');
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= rows.length) return withCounts(rows);

    const a = rows[idx]!;
    const b = rows[swapIdx]!;
    await db.transaction(async (trx) => {
      await trx('categories').where({ id: a.id }).update({ sort_order: b.sort_order });
      await trx('categories').where({ id: b.id }).update({ sort_order: a.sort_order });
    });

    const fresh = await db('categories').orderBy('sort_order', 'asc').orderBy('id', 'asc');
    return withCounts(fresh);
  },
};
