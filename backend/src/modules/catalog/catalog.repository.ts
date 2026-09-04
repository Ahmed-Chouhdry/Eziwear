import type { Knex } from 'knex';
import { db } from '../../config/db.js';
import type {
  CategoryRow,
  ProductImageRow,
  ProductRow,
  ProductVariantRow,
} from '../../database/types.js';
import { toProductDto, type ProductDto } from './catalog.dto.js';
import type { ProductQuery } from './catalog.schemas.js';

type ProductRowWithCat = ProductRow & {
  category_slug: string | null;
  category_name: string | null;
};

const SPECIAL = new Set(['sale', 'vip', 'new-arrivals', 'best-sellers', 'featured']);

function baseProductQuery(): Knex.QueryBuilder {
  return db('products as p')
    .join('categories as c', 'c.id', 'p.category_id')
    .where('p.status', 'published')
    .select('p.*', { category_slug: 'c.slug', category_name: 'c.name' });
}

function applyFilters(qb: Knex.QueryBuilder, q: Partial<ProductQuery>): Knex.QueryBuilder {
  if (q.category && !SPECIAL.has(q.category)) {
    qb.where('c.slug', q.category);
  }
  if (q.category === 'sale') qb.whereNotNull('p.sale_price');
  if (q.category === 'vip') qb.where('p.is_vip', true);
  if (q.category === 'new-arrivals') qb.where('p.is_new_arrival', true);
  if (q.category === 'featured') qb.where('p.is_featured', true);

  if (q.search) qb.where('p.name', 'like', `%${q.search}%`);

  const effective = db.raw('COALESCE(p.sale_price, p.price)');
  if (q.minPrice != null) qb.where(effective, '>=', q.minPrice);
  if (q.maxPrice != null) qb.where(effective, '<=', q.maxPrice);

  if (q.sizes?.length) {
    qb.whereExists((sub) =>
      sub.from('product_variants as v').whereRaw('v.product_id = p.id').whereIn('v.size', q.sizes!),
    );
  }
  if (q.colors?.length) {
    qb.whereExists((sub) =>
      sub.from('product_variants as v').whereRaw('v.product_id = p.id').whereIn('v.color', q.colors!),
    );
  }
  if (q.inStock) {
    qb.whereExists((sub) =>
      sub.from('product_variants as v').whereRaw('v.product_id = p.id').where('v.stock', '>', 0),
    );
  }
  return qb;
}

function applySort(qb: Knex.QueryBuilder, sort: ProductQuery['sort']): Knex.QueryBuilder {
  switch (sort) {
    case 'price-asc':
      return qb.orderByRaw('COALESCE(p.sale_price, p.price) asc');
    case 'price-desc':
      return qb.orderByRaw('COALESCE(p.sale_price, p.price) desc');
    case 'popular':
      return qb
        .orderBy('p.is_featured', 'desc')
        .orderBy('p.is_vip', 'desc')
        .orderBy('p.id', 'desc');
    default:
      return qb.orderBy('p.id', 'desc');
  }
}

async function hydrate(rows: ProductRowWithCat[]): Promise<ProductDto[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [images, variants, reviews] = await Promise.all([
    db('product_images').whereIn('product_id', ids).orderBy('sort_order', 'asc'),
    db('product_variants').whereIn('product_id', ids).orderBy('id', 'asc'),
    db('reviews')
      .whereIn('product_id', ids)
      .where('status', 'approved')
      .groupBy('product_id')
      .select('product_id')
      .avg({ avg: 'rating' })
      .count<{ product_id: number; avg: string | null; cnt: number }[]>({ cnt: '*' }),
  ]);

  const imagesByProduct = groupBy(images as ProductImageRow[], (i) => i.product_id);
  const variantsByProduct = groupBy(variants as ProductVariantRow[], (v) => v.product_id);
  const reviewByProduct = new Map(
    (reviews as { product_id: number; avg: string | null; cnt: number }[]).map((r) => [
      r.product_id,
      { rating: r.avg != null ? Math.round(Number(r.avg) * 10) / 10 : null, count: Number(r.cnt) },
    ]),
  );

  return rows.map((row) =>
    toProductDto(
      row,
      imagesByProduct.get(row.id) ?? [],
      variantsByProduct.get(row.id) ?? [],
      reviewByProduct.get(row.id),
    ),
  );
}

function groupBy<T, K>(items: T[], key: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const arr = map.get(k);
    if (arr) arr.push(item);
    else map.set(k, [item]);
  }
  return map;
}

export const catalogRepository = {
  async listCategories(): Promise<CategoryRow[]> {
    return db('categories').where('status', 'active').orderBy('sort_order', 'asc').orderBy('name', 'asc');
  },

  async listProducts(q: ProductQuery): Promise<{ items: ProductDto[]; total: number }> {
    const countQb = db('products as p')
      .join('categories as c', 'c.id', 'p.category_id')
      .where('p.status', 'published')
      .count<{ n: number }[]>({ n: 'p.id' });
    const countRow = await applyFilters(countQb, q);
    const total = Number(countRow[0]?.n ?? 0);

    const rows = (await applySort(applyFilters(baseProductQuery(), q), q.sort)
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize)) as ProductRowWithCat[];

    return { items: await hydrate(rows), total };
  },

  async section(section: string, limit: number): Promise<ProductDto[]> {
    if (section === 'best-sellers') {
      const rows = (await baseProductQuery()
        .select(
          db.raw(`(
            SELECT COALESCE(SUM(oi.quantity), 0)
            FROM order_items oi
            JOIN orders o ON o.id = oi.order_id
            WHERE oi.product_id = p.id
              AND o.order_status IN ('confirmed','processing','shipped','delivered')
          ) as sold`),
        )
        .orderBy('sold', 'desc')
        .orderBy('p.is_featured', 'desc')
        .orderBy('p.id', 'desc')
        .limit(limit)) as ProductRowWithCat[];
      return hydrate(rows);
    }

    const rows = (await applySort(
      applyFilters(baseProductQuery(), { category: section }),
      section === 'sale' ? 'newest' : 'popular',
    ).limit(limit)) as ProductRowWithCat[];
    return hydrate(rows);
  },

  async getBySlug(slug: string): Promise<ProductDto | null> {
    const row = (await baseProductQuery().where('p.slug', slug).first()) as ProductRowWithCat | undefined;
    if (!row) return null;
    const [dto] = await hydrate([row]);
    return dto ?? null;
  },

  async related(productId: number, categoryId: number, limit: number): Promise<ProductDto[]> {
    const rows = (await baseProductQuery()
      .where('p.category_id', categoryId)
      .whereNot('p.id', productId)
      .orderByRaw('RAND()')
      .limit(limit)) as ProductRowWithCat[];
    return hydrate(rows);
  },

  async filterOptions(category?: string): Promise<{
    sizes: string[];
    colors: { name: string; hex: string | null }[];
    priceRange: { min: number; max: number };
  }> {
    const productIds = baseProductQuery().clearSelect().select('p.id');
    if (category && !SPECIAL.has(category)) productIds.where('c.slug', category);
    if (category === 'sale') productIds.whereNotNull('p.sale_price');
    if (category === 'vip') productIds.where('p.is_vip', true);
    if (category === 'new-arrivals') productIds.where('p.is_new_arrival', true);
    if (category === 'featured') productIds.where('p.is_featured', true);

    const [sizeRows, colorRows, priceRow] = await Promise.all([
      db('product_variants').whereIn('product_id', productIds.clone()).distinct('size').orderBy('size'),
      db('product_variants')
        .whereIn('product_id', productIds.clone())
        .select('color', 'color_hex')
        .groupBy('color', 'color_hex')
        .orderBy('color'),
      db('products as p')
        .join('categories as c', 'c.id', 'p.category_id')
        .where('p.status', 'published')
        .modify((qb) => {
          if (category && !SPECIAL.has(category)) qb.where('c.slug', category);
          if (category === 'sale') qb.whereNotNull('p.sale_price');
          if (category === 'vip') qb.where('p.is_vip', true);
          if (category === 'new-arrivals') qb.where('p.is_new_arrival', true);
          if (category === 'featured') qb.where('p.is_featured', true);
        })
        .select(
          db.raw('MIN(COALESCE(p.sale_price, p.price)) as min'),
          db.raw('MAX(COALESCE(p.sale_price, p.price)) as max'),
        )
        .first<{ min: number | null; max: number | null } | undefined>(),
    ]);

    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
    const sizes = (sizeRows as { size: string }[])
      .map((r) => r.size)
      .sort((a, b) => {
        const ia = sizeOrder.indexOf(a);
        const ib = sizeOrder.indexOf(b);
        if (ia === -1 && ib === -1) return a.localeCompare(b);
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      });

    return {
      sizes,
      colors: (colorRows as { color: string; color_hex: string | null }[]).map((r) => ({
        name: r.color,
        hex: r.color_hex,
      })),
      priceRange: {
        min: Math.floor(Number(priceRow?.min ?? 0)),
        max: Math.ceil(Number(priceRow?.max ?? 0)),
      },
    };
  },
};
