import type { Knex } from 'knex';
import { db } from '../../config/db.js';
import type { ProductRow } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate, type Paginated } from '../../utils/response.js';
import type {
  CreateProductInput,
  ProductListQuery,
  UpdateProductInput,
} from './product.schemas.js';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function uniqueSlug(base: string, ignoreId?: number, trx?: Knex): Promise<string> {
  const q = trx ?? db;
  let candidate = base || 'product';
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const row = await q('products')
      .where({ slug: candidate })
      .modify((b) => ignoreId && b.whereNot({ id: ignoreId }))
      .first();
    if (!row) return candidate;
    candidate = `${base}-${++n}`;
  }
}

interface AdminProductDto {
  id: number;
  categoryId: number;
  categoryName: string | null;
  name: string;
  slug: string;
  description: string | null;
  sku: string;
  price: number;
  salePrice: number | null;
  status: ProductRow['status'];
  isNewArrival: boolean;
  isFeatured: boolean;
  isVip: boolean;
  images: { id: number; imageUrl: string; sortOrder: number }[];
  variants: {
    id: number;
    size: string;
    color: string;
    colorHex: string | null;
    stock: number;
    sku: string;
  }[];
  totalStock: number;
  createdAt: string;
}

async function hydrate(
  row: ProductRow & { category_name?: string | null },
  q: Knex = db,
): Promise<AdminProductDto> {
  const [images, variants] = await Promise.all([
    q('product_images').where({ product_id: row.id }).orderBy('sort_order', 'asc'),
    q('product_variants').where({ product_id: row.id }).orderBy('id', 'asc'),
  ]);
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: row.category_name ?? null,
    name: row.name,
    slug: row.slug,
    description: row.description,
    sku: row.sku,
    price: row.price,
    salePrice: row.sale_price,
    status: row.status,
    isNewArrival: !!row.is_new_arrival,
    isFeatured: !!row.is_featured,
    isVip: !!row.is_vip,
    images: images.map((i) => ({ id: i.id, imageUrl: i.image_url, sortOrder: i.sort_order })),
    variants: variants.map((v) => ({
      id: v.id,
      size: v.size,
      color: v.color,
      colorHex: v.color_hex,
      stock: v.stock,
      sku: v.sku,
    })),
    totalStock: variants.reduce((n, v) => n + v.stock, 0),
    createdAt: row.created_at,
  };
}

export const adminProductService = {
  async list(q: ProductListQuery): Promise<Paginated<Omit<AdminProductDto, 'variants' | 'images'> & { image: string | null; variantCount: number }>> {
    const base = db('products as p').join('categories as c', 'c.id', 'p.category_id');
    if (q.search) base.where('p.name', 'like', `%${q.search}%`);
    if (q.status) base.where('p.status', q.status);
    if (q.category) base.where('c.slug', q.category);

    const countRow = await base.clone().count<{ n: number }[]>({ n: 'p.id' });
    const total = Number(countRow[0]?.n ?? 0);

    const rows = await base
      .clone()
      .orderBy('p.id', 'desc')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize)
      .select('p.*', { category_name: 'c.name' })
      .select(
        db.raw(
          `(SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order LIMIT 1) as image`,
        ),
        db.raw(`(SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) as variant_count`),
        db.raw(`(SELECT COALESCE(SUM(stock),0) FROM product_variants WHERE product_id = p.id) as total_stock`),
      );

    const items = (rows as (ProductRow & {
      category_name: string | null;
      image: string | null;
      variant_count: number;
      total_stock: number;
    })[]).map((r) => ({
      id: r.id,
      categoryId: r.category_id,
      categoryName: r.category_name,
      name: r.name,
      slug: r.slug,
      description: r.description,
      sku: r.sku,
      price: r.price,
      salePrice: r.sale_price,
      status: r.status,
      isNewArrival: !!r.is_new_arrival,
      isFeatured: !!r.is_featured,
      isVip: !!r.is_vip,
      image: r.image,
      variantCount: Number(r.variant_count),
      totalStock: Number(r.total_stock),
      createdAt: r.created_at,
    }));

    return paginate(items, total, q.page, q.pageSize);
  },

  async get(id: number): Promise<AdminProductDto> {
    const row = await db('products as p')
      .join('categories as c', 'c.id', 'p.category_id')
      .where('p.id', id)
      .select('p.*', { category_name: 'c.name' })
      .first();
    if (!row) throw ApiError.notFound('Product not found');
    return hydrate(row);
  },

  async create(input: CreateProductInput): Promise<AdminProductDto> {
    return db.transaction(async (trx) => {
      await assertCategory(trx, input.categoryId);
      await assertSkuFree(trx, input.sku);
      const slug = await uniqueSlug(input.slug ?? slugify(input.name), undefined, trx);

      const [id] = await trx('products').insert({
        category_id: input.categoryId,
        name: input.name,
        slug,
        description: input.description ?? null,
        sku: input.sku,
        price: input.price,
        sale_price: input.salePrice ?? null,
        status: input.status,
        is_new_arrival: input.isNewArrival,
        is_featured: input.isFeatured,
        is_vip: input.isVip,
      });
      const productId = Number(id);

      if (input.images.length) {
        await trx('product_images').insert(
          input.images.map((im, i) => ({
            product_id: productId,
            image_url: im.imageUrl,
            sort_order: im.sortOrder || i + 1,
          })),
        );
      }
      if (input.variants.length) {
        await assertVariantSkus(trx, input.variants.map((v) => v.sku));
        await trx('product_variants').insert(
          input.variants.map((v) => ({
            product_id: productId,
            size: v.size,
            color: v.color,
            color_hex: v.colorHex ?? null,
            stock: v.stock,
            sku: v.sku,
          })),
        );
      }

      const row = await trx('products as p')
        .join('categories as c', 'c.id', 'p.category_id')
        .where('p.id', productId)
        .select('p.*', { category_name: 'c.name' })
        .first();
      return hydrate(row, trx);
    });
  },

  async update(id: number, input: UpdateProductInput): Promise<AdminProductDto> {
    return db.transaction(async (trx) => {
      const existing = await trx('products').where({ id }).first();
      if (!existing) throw ApiError.notFound('Product not found');
      if (input.categoryId) await assertCategory(trx, input.categoryId);
      if (input.sku && input.sku !== existing.sku) await assertSkuFree(trx, input.sku);

      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch['name'] = input.name;
      if (input.slug !== undefined) patch['slug'] = await uniqueSlug(input.slug, id, trx);
      if (input.description !== undefined) patch['description'] = input.description ?? null;
      if (input.sku !== undefined) patch['sku'] = input.sku;
      if (input.categoryId !== undefined) patch['category_id'] = input.categoryId;
      if (input.price !== undefined) patch['price'] = input.price;
      if (input.salePrice !== undefined) patch['sale_price'] = input.salePrice ?? null;
      if (input.status !== undefined) patch['status'] = input.status;
      if (input.isNewArrival !== undefined) patch['is_new_arrival'] = input.isNewArrival;
      if (input.isFeatured !== undefined) patch['is_featured'] = input.isFeatured;
      if (input.isVip !== undefined) patch['is_vip'] = input.isVip;

      if (Object.keys(patch).length) await trx('products').where({ id }).update(patch);

      const row = await trx('products as p')
        .join('categories as c', 'c.id', 'p.category_id')
        .where('p.id', id)
        .select('p.*', { category_name: 'c.name' })
        .first();
      return hydrate(row, trx);
    });
  },

  async replaceImages(id: number, images: { imageUrl: string; sortOrder: number }[]): Promise<AdminProductDto> {
    return db.transaction(async (trx) => {
      const exists = await trx('products').where({ id }).first();
      if (!exists) throw ApiError.notFound('Product not found');
      await trx('product_images').where({ product_id: id }).del();
      if (images.length) {
        await trx('product_images').insert(
          images.map((im, i) => ({
            product_id: id,
            image_url: im.imageUrl,
            sort_order: im.sortOrder || i + 1,
          })),
        );
      }
      const row = await trx('products as p')
        .join('categories as c', 'c.id', 'p.category_id')
        .where('p.id', id)
        .select('p.*', { category_name: 'c.name' })
        .first();
      return hydrate(row, trx);
    });
  },

  async addVariant(productId: number, v: { size: string; color: string; colorHex?: string; stock: number; sku: string }) {
    const product = await db('products').where({ id: productId }).first();
    if (!product) throw ApiError.notFound('Product not found');
    const dupe = await db('product_variants')
      .where({ product_id: productId, size: v.size, color: v.color })
      .first();
    if (dupe) throw ApiError.conflict('That size / colour combination already exists');
    await assertVariantSkus(db, [v.sku]);
    await db('product_variants').insert({
      product_id: productId,
      size: v.size,
      color: v.color,
      color_hex: v.colorHex ?? null,
      stock: v.stock,
      sku: v.sku,
    });
    return adminProductService.get(productId);
  },

  async updateVariant(variantId: number, patch: Partial<{ size: string; color: string; colorHex?: string; stock: number; sku: string }>) {
    const v = await db('product_variants').where({ id: variantId }).first();
    if (!v) throw ApiError.notFound('Variant not found');
    if (patch.sku && patch.sku !== v.sku) await assertVariantSkus(db, [patch.sku]);
    const update: Record<string, unknown> = {};
    if (patch.size !== undefined) update['size'] = patch.size;
    if (patch.color !== undefined) update['color'] = patch.color;
    if (patch.colorHex !== undefined) update['color_hex'] = patch.colorHex ?? null;
    if (patch.stock !== undefined) update['stock'] = patch.stock;
    if (patch.sku !== undefined) update['sku'] = patch.sku;
    if (Object.keys(update).length) await db('product_variants').where({ id: variantId }).update(update);
    return adminProductService.get(v.product_id);
  },

  async deleteVariant(variantId: number): Promise<void> {
    const v = await db('product_variants').where({ id: variantId }).first();
    if (!v) throw ApiError.notFound('Variant not found');
    const used = await db('order_items').where({ variant_id: variantId }).first();
    if (used) {
      // keep it for order history, just take it out of stock
      await db('product_variants').where({ id: variantId }).update({ stock: 0 });
      throw ApiError.conflict(
        'This variant is on past orders — its stock was set to 0 instead of deleting',
      );
    }
    await db('product_variants').where({ id: variantId }).del();
  },

  async archive(id: number): Promise<void> {
    const product = await db('products').where({ id }).first();
    if (!product) throw ApiError.notFound('Product not found');
    await db('products').where({ id }).update({ status: 'archived' });
  },

  async remove(id: number): Promise<{ archived: boolean }> {
    const product = await db('products').where({ id }).first();
    if (!product) throw ApiError.notFound('Product not found');
    const onOrders = await db('order_items').where({ product_id: id }).first();
    if (onOrders) {
      await db('products').where({ id }).update({ status: 'archived' });
      return { archived: true };
    }
    await db('products').where({ id }).del();
    return { archived: false };
  },
};

async function assertCategory(trx: Knex, categoryId: number): Promise<void> {
  const cat = await trx('categories').where({ id: categoryId }).first();
  if (!cat) throw ApiError.badRequest('Category not found');
}

async function assertSkuFree(trx: Knex, sku: string): Promise<void> {
  const row = await trx('products').where({ sku }).first();
  if (row) throw ApiError.conflict(`A product with SKU "${sku}" already exists`);
}

async function assertVariantSkus(trx: Knex, skus: string[]): Promise<void> {
  const dupes = new Set(skus.filter((s, i) => skus.indexOf(s) !== i));
  if (dupes.size) throw ApiError.badRequest(`Duplicate variant SKU: ${[...dupes].join(', ')}`);
  const taken = await trx('product_variants').whereIn('sku', skus).pluck('sku');
  if (taken.length) throw ApiError.conflict(`Variant SKU already in use: ${taken.join(', ')}`);
}
