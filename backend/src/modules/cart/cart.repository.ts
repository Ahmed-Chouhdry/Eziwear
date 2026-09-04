import { db } from '../../config/db.js';
import type { CartItemRow, CartRow } from '../../database/types.js';
import type { Knex } from 'knex';

export interface VariantDetail {
  variantId: number;
  productId: number;
  size: string;
  color: string;
  stock: number;
  name: string;
  slug: string;
  price: number;
  salePrice: number | null;
  status: string;
  image: string | null;
}

export const cartRepository = {
  async getOrCreateCart(userId: number): Promise<CartRow> {
    const existing = await db('carts').where({ user_id: userId }).first();
    if (existing) return existing;
    const [id] = await db('carts').insert({ user_id: userId });
    return (await db('carts').where({ id }).first())!;
  },

  items(cartId: number): Promise<CartItemRow[]> {
    return db('cart_items').where({ cart_id: cartId }).orderBy('id', 'asc');
  },

  findItem(cartId: number, variantId: number): Promise<CartItemRow | undefined> {
    return db('cart_items').where({ cart_id: cartId, product_variant_id: variantId }).first();
  },

  async insertItem(
    cartId: number,
    variantId: number,
    quantity: number,
    unitPrice: number,
    trx?: Knex.Transaction,
  ): Promise<void> {
    await (trx ?? db)('cart_items').insert({
      cart_id: cartId,
      product_variant_id: variantId,
      quantity,
      unit_price: unitPrice,
    });
  },

  async setItemQuantity(
    id: number,
    quantity: number,
    unitPrice: number,
    trx?: Knex.Transaction,
  ): Promise<void> {
    await (trx ?? db)('cart_items').where({ id }).update({ quantity, unit_price: unitPrice });
  },

  async deleteItem(cartId: number, id: number): Promise<number> {
    return db('cart_items').where({ id, cart_id: cartId }).del();
  },

  async clear(cartId: number): Promise<void> {
    await db('cart_items').where({ cart_id: cartId }).del();
  },

  /** Enriches variant ids with product + image + stock details in one round-trip. */
  async variantDetails(variantIds: number[]): Promise<Map<number, VariantDetail>> {
    if (variantIds.length === 0) return new Map();
    const rows = await db('product_variants as v')
      .join('products as p', 'p.id', 'v.product_id')
      .whereIn('v.id', variantIds)
      .select(
        'v.id as variantId',
        'v.product_id as productId',
        'v.size',
        'v.color',
        'v.stock',
        'p.name',
        'p.slug',
        'p.price',
        'p.sale_price as salePrice',
        'p.status',
      )
      .select(
        db.raw(
          `(SELECT image_url FROM product_images WHERE product_id = p.id ORDER BY sort_order ASC LIMIT 1) as image`,
        ),
      );

    return new Map((rows as VariantDetail[]).map((r) => [r.variantId, r]));
  },
};
