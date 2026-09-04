import { db } from '../../config/db.js';
import type { CouponRow } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import { computeTotals, round2, type Totals } from '../../utils/pricing.js';
import type { AppliedCoupon, CartDto, CartLineDto } from './cart.dto.js';
import { cartRepository, type VariantDetail } from './cart.repository.js';
import type { CouponValidateInput, LineItemInput } from './cart.schemas.js';

function unitPriceOf(v: VariantDetail): number {
  return v.salePrice != null && v.salePrice < v.price ? v.salePrice : v.price;
}

/** Turns raw {variantId, quantity} lines into priced, stock-checked cart lines. */
async function enrich(
  lines: { id?: number | null; variantId: number; quantity: number }[],
): Promise<CartLineDto[]> {
  const details = await cartRepository.variantDetails(lines.map((l) => l.variantId));
  const out: CartLineDto[] = [];

  for (const line of lines) {
    const v = details.get(line.variantId);
    if (!v || v.status !== 'published') continue; // silently drop removed products

    const maxStock = Math.max(0, v.stock);
    const quantity = Math.max(0, Math.min(line.quantity, maxStock));
    if (quantity === 0) {
      out.push({
        id: line.id ?? null,
        productId: v.productId,
        variantId: v.variantId,
        name: v.name,
        slug: v.slug,
        image: v.image,
        size: v.size,
        color: v.color,
        unitPrice: unitPriceOf(v),
        quantity: 0,
        maxStock,
        lineTotal: 0,
        adjusted: true,
        inStock: false,
      });
      continue;
    }

    const unitPrice = unitPriceOf(v);
    out.push({
      id: line.id ?? null,
      productId: v.productId,
      variantId: v.variantId,
      name: v.name,
      slug: v.slug,
      image: v.image,
      size: v.size,
      color: v.color,
      unitPrice,
      quantity,
      maxStock,
      lineTotal: round2(unitPrice * quantity),
      adjusted: quantity !== line.quantity,
      inStock: true,
    });
  }

  return out;
}

function subtotalOf(lines: CartLineDto[]): number {
  return round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
}

async function resolveCoupon(
  code: string,
  subtotal: number,
): Promise<AppliedCoupon> {
  const coupon = (await db('coupons').whereRaw('UPPER(code) = ?', [code.toUpperCase()]).first()) as
    | CouponRow
    | undefined;

  if (!coupon || coupon.status !== 'active') {
    throw ApiError.badRequest('That coupon code is not valid');
  }
  const now = Date.now();
  if (coupon.start_at && new Date(coupon.start_at).getTime() > now) {
    throw ApiError.badRequest('That coupon is not active yet');
  }
  if (coupon.end_at && new Date(coupon.end_at).getTime() < now) {
    throw ApiError.badRequest('That coupon has expired');
  }
  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit) {
    throw ApiError.badRequest('That coupon has reached its usage limit');
  }
  if (coupon.min_order != null && subtotal < coupon.min_order) {
    throw ApiError.badRequest(`Add Rs ${Math.ceil(coupon.min_order - subtotal)} more to use this coupon`);
  }

  let discount =
    coupon.type === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
  discount = round2(Math.min(discount, subtotal));

  return { code: coupon.code, type: coupon.type, value: coupon.value, discount };
}

function assemble(lines: CartLineDto[], coupon: AppliedCoupon | null, requestedCount: number): CartDto {
  const active = lines.filter((l) => l.quantity > 0);
  const subtotal = subtotalOf(active);
  let applied: AppliedCoupon | null = null;
  let totals: Totals;

  if (coupon) {
    // re-scale a percentage coupon to the current subtotal; keep fixed as-is (capped)
    const raw = coupon.type === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
    const discount = round2(Math.min(raw, subtotal));
    applied = { ...coupon, discount };
    totals = computeTotals(subtotal, discount);
  } else {
    totals = computeTotals(subtotal, 0);
  }

  return {
    items: active,
    totals,
    coupon: applied,
    changed: active.length !== requestedCount || lines.some((l) => l.adjusted),
  };
}

export const cartService = {
  async get(userId: number): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);
    const rows = await cartRepository.items(cart.id);
    const lines = await enrich(
      rows.map((r) => ({ id: r.id, variantId: r.product_variant_id, quantity: r.quantity })),
    );
    // reconcile: drop zero-stock rows from the DB so the cart stays clean
    const dead = lines.filter((l) => l.quantity === 0 && l.id != null);
    for (const d of dead) await cartRepository.deleteItem(cart.id, d.id as number);
    return assemble(lines, null, rows.length);
  },

  async addItem(userId: number, input: LineItemInput): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);
    const [detail] = [...(await cartRepository.variantDetails([input.variantId])).values()];
    if (!detail || detail.status !== 'published') throw ApiError.notFound('Product not available');
    if (detail.stock <= 0) throw ApiError.badRequest('That item is out of stock');

    const existing = await cartRepository.findItem(cart.id, input.variantId);
    const desired = (existing?.quantity ?? 0) + input.quantity;
    const quantity = Math.min(desired, detail.stock);
    const unitPrice = unitPriceOf(detail);

    if (existing) {
      await cartRepository.setItemQuantity(existing.id, quantity, unitPrice);
    } else {
      await cartRepository.insertItem(cart.id, input.variantId, quantity, unitPrice);
    }
    return this.get(userId);
  },

  async updateItem(userId: number, itemId: number, quantity: number): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);
    const row = await db('cart_items').where({ id: itemId, cart_id: cart.id }).first();
    if (!row) throw ApiError.notFound('Cart item not found');

    const [detail] = [...(await cartRepository.variantDetails([row.product_variant_id])).values()];
    if (!detail) {
      await cartRepository.deleteItem(cart.id, itemId);
      return this.get(userId);
    }
    const capped = Math.min(quantity, Math.max(0, detail.stock));
    if (capped <= 0) {
      await cartRepository.deleteItem(cart.id, itemId);
    } else {
      await cartRepository.setItemQuantity(itemId, capped, unitPriceOf(detail));
    }
    return this.get(userId);
  },

  async removeItem(userId: number, itemId: number): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);
    await cartRepository.deleteItem(cart.id, itemId);
    return this.get(userId);
  },

  async clear(userId: number): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);
    await cartRepository.clear(cart.id);
    return this.get(userId);
  },

  async merge(userId: number, guestLines: LineItemInput[]): Promise<CartDto> {
    const cart = await cartRepository.getOrCreateCart(userId);
    const details = await cartRepository.variantDetails(guestLines.map((l) => l.variantId));

    for (const line of guestLines) {
      const detail = details.get(line.variantId);
      if (!detail || detail.status !== 'published' || detail.stock <= 0) continue;
      const existing = await cartRepository.findItem(cart.id, line.variantId);
      const quantity = Math.min((existing?.quantity ?? 0) + line.quantity, detail.stock);
      const unitPrice = unitPriceOf(detail);
      if (existing) await cartRepository.setItemQuantity(existing.id, quantity, unitPrice);
      else await cartRepository.insertItem(cart.id, line.variantId, quantity, unitPrice);
    }
    return this.get(userId);
  },

  /** Stateless — used by guests and at checkout to reconcile a client cart with live stock. */
  async validate(lines: LineItemInput[]): Promise<CartDto> {
    const enriched = await enrich(lines);
    return assemble(enriched, null, lines.length);
  },

  async validateCoupon(input: CouponValidateInput): Promise<AppliedCoupon> {
    const enriched = await enrich(input.items);
    const subtotal = subtotalOf(enriched.filter((l) => l.quantity > 0));
    if (subtotal <= 0) throw ApiError.badRequest('Your cart is empty');
    return resolveCoupon(input.code, subtotal);
  },
};
