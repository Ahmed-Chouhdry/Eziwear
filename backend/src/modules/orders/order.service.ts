import { randomBytes } from 'node:crypto';
import type { Knex } from 'knex';
import { db } from '../../config/db.js';
import type { CouponRow, OrderRow } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import { computeTotals, round2 } from '../../utils/pricing.js';
import { toOrderDto, type OrderDto } from './order.dto.js';
import type { CreateGuestOrderInput, CreateOrderInput } from './order.schemas.js';

interface CartLine {
  cartItemId: number;
  variantId: number;
  productId: number;
  productName: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  salePrice: number | null;
  stock: number;
  status: string;
}

function unitPriceOf(line: { price: number; salePrice: number | null }): number {
  return line.salePrice != null && line.salePrice < line.price ? line.salePrice : line.price;
}

async function loadCartForUpdate(trx: Knex.Transaction, userId: number): Promise<CartLine[]> {
  const cart = await trx('carts').where({ user_id: userId }).first();
  if (!cart) return [];

  // lock the variant rows we are about to decrement
  const rows = await trx('cart_items as ci')
    .join('product_variants as v', 'v.id', 'ci.product_variant_id')
    .join('products as p', 'p.id', 'v.product_id')
    .where('ci.cart_id', cart.id)
    .forUpdate('v')
    .select(
      'ci.id as cartItemId',
      'ci.product_variant_id as variantId',
      'v.product_id as productId',
      'v.size',
      'v.color',
      'v.stock',
      'ci.quantity',
      'p.name as productName',
      'p.price',
      'p.sale_price as salePrice',
      'p.status',
    );

  return rows as CartLine[];
}

async function loadGuestLines(
  trx: Knex.Transaction,
  items: CreateGuestOrderInput['items'],
): Promise<CartLine[]> {
  const qtyByVariant = new Map<number, number>();
  for (const i of items) qtyByVariant.set(i.variantId, (qtyByVariant.get(i.variantId) ?? 0) + i.quantity);

  const rows = await trx('product_variants as v')
    .join('products as p', 'p.id', 'v.product_id')
    .whereIn('v.id', [...qtyByVariant.keys()])
    .forUpdate('v')
    .select(
      'v.id as variantId',
      'v.product_id as productId',
      'v.size',
      'v.color',
      'v.stock',
      'p.name as productName',
      'p.price',
      'p.sale_price as salePrice',
      'p.status',
    );

  if (rows.length !== qtyByVariant.size) {
    throw ApiError.conflict('Some items in your cart are no longer available');
  }
  return rows.map((r) => ({
    ...(r as Omit<CartLine, 'cartItemId' | 'quantity'>),
    cartItemId: 0,
    quantity: qtyByVariant.get(r.variantId as number) as number,
  }));
}

async function resolveCoupon(
  trx: Knex.Transaction,
  code: string,
  subtotal: number,
): Promise<{ coupon: CouponRow; discount: number }> {
  const coupon = (await trx('coupons')
    .whereRaw('UPPER(code) = ?', [code.toUpperCase()])
    .forUpdate()
    .first()) as CouponRow | undefined;

  if (!coupon || coupon.status !== 'active') throw ApiError.badRequest('That coupon is not valid');
  const now = Date.now();
  if (coupon.start_at && new Date(coupon.start_at).getTime() > now)
    throw ApiError.badRequest('That coupon is not active yet');
  if (coupon.end_at && new Date(coupon.end_at).getTime() < now)
    throw ApiError.badRequest('That coupon has expired');
  if (coupon.usage_limit != null && coupon.used_count >= coupon.usage_limit)
    throw ApiError.badRequest('That coupon has reached its usage limit');
  if (coupon.min_order != null && subtotal < coupon.min_order)
    throw ApiError.badRequest('Your order no longer meets the coupon minimum');

  let discount = coupon.type === 'percentage' ? (subtotal * coupon.value) / 100 : coupon.value;
  if (coupon.max_discount != null) discount = Math.min(discount, coupon.max_discount);
  return { coupon, discount: round2(Math.min(discount, subtotal)) };
}

export const orderService = {
  async create(userId: number, input: CreateOrderInput): Promise<OrderDto> {
    return db.transaction(async (trx) => {
      const lines = await loadCartForUpdate(trx, userId);
      const ship = await resolveShipping(trx, userId, input);
      const { orderNumber } = await placeOrder(trx, {
        userId,
        lines,
        ship,
        addressId: input.addressId ?? null,
        couponCode: input.couponCode,
        notes: input.notes,
        guest: null,
      });

      const cart = await trx('carts').where({ user_id: userId }).first();
      if (cart) await trx('cart_items').where({ cart_id: cart.id }).del();

      return this.getByNumber(userId, orderNumber, trx);
    });
  },

  async createGuest(input: CreateGuestOrderInput): Promise<OrderDto & { guestToken: string }> {
    const guestToken = randomBytes(24).toString('hex');
    const orderNumber = await db.transaction(async (trx) => {
      const lines = await loadGuestLines(trx, input.items);
      const a = input.address;
      const placed = await placeOrder(trx, {
        userId: null,
        lines,
        ship: {
          name: a.name,
          phone: a.phone,
          address: a.address,
          city: a.city,
          area: a.area ?? null,
          postalCode: a.postalCode ?? null,
        },
        addressId: null,
        couponCode: input.couponCode,
        notes: input.notes,
        guest: { email: input.email, token: guestToken },
      });
      return placed.orderNumber;
    });
    return { ...(await this.getGuest(orderNumber, guestToken)), guestToken };
  },

  async getGuest(orderNumber: string, token: string): Promise<OrderDto> {
    const order = await db('orders')
      .where({ order_number: orderNumber, guest_token: token })
      .whereNull('user_id')
      .first();
    if (!order) throw ApiError.notFound('Order not found');
    return loadOrderDto(db, order);
  },

  async list(userId: number): Promise<Array<Pick<OrderDto, 'orderNumber' | 'total' | 'orderStatus' | 'paymentStatus' | 'createdAt'> & { itemCount: number; firstItem: string; firstImage: string | null }>> {
    const orders = await db('orders').where({ user_id: userId }).orderBy('id', 'desc');
    if (orders.length === 0) return [];

    const ids = orders.map((o) => o.id);
    const items = await db('order_items as oi')
      .leftJoin('products as p', 'p.id', 'oi.product_id')
      .whereIn('oi.order_id', ids)
      .select('oi.order_id', 'oi.product_name', 'oi.quantity', 'p.slug')
      .select(
        db.raw(
          `(SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY sort_order LIMIT 1) as image`,
        ),
      );

    return orders.map((o) => {
      const mine = items.filter((i) => i.order_id === o.id);
      return {
        orderNumber: o.order_number,
        total: o.total,
        orderStatus: o.order_status,
        paymentStatus: o.payment_status,
        createdAt: o.created_at,
        itemCount: mine.reduce((n, i) => n + i.quantity, 0),
        firstItem: mine[0]?.product_name ?? 'Order',
        firstImage: (mine[0] as { image?: string | null })?.image ?? null,
      };
    });
  },

  async getByNumber(userId: number, orderNumber: string, trx?: Knex.Transaction): Promise<OrderDto> {
    const q = trx ?? db;
    const order = await q('orders').where({ order_number: orderNumber, user_id: userId }).first();
    if (!order) throw ApiError.notFound('Order not found');

    return loadOrderDto(q, order);
  },
};

interface ShipInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  area: string | null;
  postalCode: string | null;
}

async function placeOrder(
  trx: Knex.Transaction,
  o: {
    userId: number | null;
    lines: CartLine[];
    ship: ShipInfo;
    addressId: number | null;
    couponCode: string | undefined;
    notes: string | undefined;
    guest: { email: string; token: string } | null;
  },
): Promise<{ orderId: number; orderNumber: string }> {
  const { lines } = o;
  if (lines.length === 0) throw ApiError.badRequest('Your cart is empty');

  for (const line of lines) {
    if (line.status !== 'published') {
      throw ApiError.conflict(`${line.productName} is no longer available`);
    }
    if (line.stock < line.quantity) {
      throw ApiError.conflict(
        `Only ${line.stock} of ${line.productName} (${line.size} · ${line.color}) left in stock`,
      );
    }
  }

  const subtotal = round2(lines.reduce((sum, l) => sum + unitPriceOf(l) * l.quantity, 0));

  let couponRow: CouponRow | null = null;
  let discount = 0;
  if (o.couponCode) {
    const resolved = await resolveCoupon(trx, o.couponCode, subtotal);
    couponRow = resolved.coupon;
    discount = resolved.discount;
  }
  const totals = computeTotals(subtotal, discount);

  const [insertedId] = await trx('orders').insert({
    user_id: o.userId,
    guest_email: o.guest?.email ?? null,
    guest_token: o.guest?.token ?? null,
    order_number: 'PENDING',
    address_id: o.addressId,
    coupon_id: couponRow?.id ?? null,
    ship_name: o.ship.name,
    ship_phone: o.ship.phone,
    ship_address: o.ship.address,
    ship_city: o.ship.city,
    ship_area: o.ship.area,
    ship_postal_code: o.ship.postalCode,
    subtotal: totals.subtotal,
    discount: totals.discount,
    shipping_fee: totals.shippingFee,
    total: totals.total,
    payment_method: 'cod',
    payment_status: 'pending',
    order_status: 'pending',
    notes: o.notes ?? null,
  });

  const orderId = Number(insertedId);
  const orderNumber = `EZI-${100000 + orderId}`;
  await trx('orders').where({ id: orderId }).update({ order_number: orderNumber });

  await trx('order_items').insert(
    lines.map((l) => {
      const unit = unitPriceOf(l);
      return {
        order_id: orderId,
        product_id: l.productId,
        variant_id: l.variantId,
        product_name: l.productName,
        size: l.size,
        color: l.color,
        quantity: l.quantity,
        unit_price: unit,
        subtotal: round2(unit * l.quantity),
      };
    }),
  );

  for (const l of lines) {
    await trx('product_variants').where({ id: l.variantId }).decrement('stock', l.quantity);
  }
  if (couponRow) {
    await trx('coupons').where({ id: couponRow.id }).increment('used_count', 1);
  }

  await trx('order_status_history').insert({
    order_id: orderId,
    status: 'pending',
    note: o.guest ? 'Order placed (guest checkout)' : 'Order placed',
    changed_by: o.userId,
  });

  return { orderId, orderNumber };
}

async function loadOrderDto(q: Knex | Knex.Transaction, order: OrderRow): Promise<OrderDto> {
  const [items, timeline] = await Promise.all([
    q('order_items as oi')
      .leftJoin('products as p', 'p.id', 'oi.product_id')
      .where('oi.order_id', order.id)
      .orderBy('oi.id', 'asc')
      .select('oi.*', 'p.slug')
      .select(
        db.raw(
          `(SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY sort_order LIMIT 1) as image`,
        ),
      ),
    q('order_status_history').where({ order_id: order.id }).orderBy('id', 'asc'),
  ]);
  const coupon = order.coupon_id ? await q('coupons').where({ id: order.coupon_id }).first() : null;
  return toOrderDto({ ...order, coupon_code: coupon?.code ?? null }, items, timeline);
}

async function resolveShipping(
  trx: Knex.Transaction,
  userId: number,
  input: CreateOrderInput,
): Promise<{
  name: string;
  phone: string;
  address: string;
  city: string;
  area: string | null;
  postalCode: string | null;
}> {
  if (input.addressId != null) {
    const row = await trx('addresses').where({ id: input.addressId, user_id: userId }).first();
    if (!row) throw ApiError.badRequest('Selected address not found');
    return {
      name: row.name,
      phone: row.phone,
      address: row.address,
      city: row.city,
      area: row.area,
      postalCode: row.postal_code,
    };
  }

  const a = input.address!;
  if (a.saveAddress) {
    const count = await trx('addresses').where({ user_id: userId }).count<{ n: number }[]>({ n: '*' });
    const isFirst = Number(count[0]?.n ?? 0) === 0;
    if (isFirst) await trx('addresses').where({ user_id: userId }).update({ is_default: false });
    await trx('addresses').insert({
      user_id: userId,
      name: a.name,
      phone: a.phone,
      address: a.address,
      city: a.city,
      area: a.area ?? null,
      postal_code: a.postalCode ?? null,
      is_default: isFirst,
    });
  }
  return {
    name: a.name,
    phone: a.phone,
    address: a.address,
    city: a.city,
    area: a.area ?? null,
    postalCode: a.postalCode ?? null,
  };
}
