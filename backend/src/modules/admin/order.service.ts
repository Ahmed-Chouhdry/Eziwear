import { db } from '../../config/db.js';
import type { OrderStatus } from '../../database/types.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate, type Paginated } from '../../utils/response.js';
import { toOrderDto, type OrderDto } from '../orders/order.dto.js';
import type { OrderListQuery, UpdateOrderStatusInput } from './order.schemas.js';

export interface AdminOrderListItem {
  orderNumber: string;
  customer: string;
  customerEmail: string;
  total: number;
  itemCount: number;
  orderStatus: OrderStatus;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
}

/** Only these forward transitions are allowed from the admin panel. */
const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'returned'],
  delivered: ['returned'],
  cancelled: [],
  returned: [],
};

const RESTOCK_ON: OrderStatus[] = ['cancelled', 'returned'];

async function audit(
  adminId: number,
  action: string,
  entityId: number,
  details: Record<string, unknown>,
): Promise<void> {
  await db('audit_logs').insert({
    admin_id: adminId,
    action,
    entity: 'order',
    entity_id: entityId,
    details: JSON.stringify(details),
  });
}

export const adminOrderService = {
  async list(q: OrderListQuery): Promise<Paginated<AdminOrderListItem>> {
    const base = db('orders as o').join('users as u', 'u.id', 'o.user_id');
    if (q.search) {
      base.where((b) =>
        b
          .where('o.order_number', 'like', `%${q.search}%`)
          .orWhere('u.name', 'like', `%${q.search}%`)
          .orWhere('u.email', 'like', `%${q.search}%`),
      );
    }
    if (q.status) base.where('o.order_status', q.status);
    if (q.paymentStatus) base.where('o.payment_status', q.paymentStatus);

    const countRow = await base.clone().count<{ n: number }[]>({ n: 'o.id' });
    const total = Number(countRow[0]?.n ?? 0);

    const rows = await base
      .clone()
      .orderBy('o.id', 'desc')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize)
      .select(
        'o.order_number as orderNumber',
        'u.name as customer',
        'u.email as customerEmail',
        'o.total',
        'o.order_status as orderStatus',
        'o.payment_status as paymentStatus',
        'o.payment_method as paymentMethod',
        'o.created_at as createdAt',
      )
      .select(
        db.raw('(SELECT COALESCE(SUM(quantity),0) FROM order_items WHERE order_id = o.id) as itemCount'),
      );

    const items = (rows as (AdminOrderListItem & { total: number | string })[]).map((r) => ({
      ...r,
      total: Number(r.total),
      itemCount: Number(r.itemCount),
    }));

    return paginate(items, total, q.page, q.pageSize);
  },

  async get(orderNumber: string): Promise<OrderDto> {
    const order = await db('orders').where({ order_number: orderNumber }).first();
    if (!order) throw ApiError.notFound('Order not found');

    const [items, timeline, coupon] = await Promise.all([
      db('order_items as oi')
        .leftJoin('products as p', 'p.id', 'oi.product_id')
        .where('oi.order_id', order.id)
        .orderBy('oi.id', 'asc')
        .select('oi.*', 'p.slug')
        .select(
          db.raw(
            `(SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY sort_order LIMIT 1) as image`,
          ),
        ),
      db('order_status_history').where({ order_id: order.id }).orderBy('id', 'asc'),
      order.coupon_id ? db('coupons').where({ id: order.coupon_id }).first() : null,
    ]);

    return toOrderDto({ ...order, coupon_code: coupon?.code ?? null }, items, timeline);
  },

  async updateStatus(
    adminId: number,
    orderNumber: string,
    input: UpdateOrderStatusInput,
  ): Promise<OrderDto> {
    return db.transaction(async (trx) => {
      const order = await trx('orders').where({ order_number: orderNumber }).first();
      if (!order) throw ApiError.notFound('Order not found');

      const current = order.order_status as OrderStatus;
      const next = input.status;
      if (current === next) throw ApiError.badRequest(`Order is already ${next}`);
      if (!TRANSITIONS[current].includes(next)) {
        const allowed = TRANSITIONS[current];
        throw ApiError.badRequest(
          allowed.length
            ? `Can't move from "${current}" to "${next}". Allowed next: ${allowed.join(', ')}`
            : `"${current}" is a final status and can't be changed`,
        );
      }

      const patch: Record<string, unknown> = { order_status: next };

      // COD orders are typically paid on delivery
      if (next === 'delivered' && order.payment_method === 'cod' && order.payment_status === 'pending') {
        patch['payment_status'] = 'paid';
      }
      // Refund payment automatically when an order is cancelled/returned after being paid
      if (RESTOCK_ON.includes(next) && order.payment_status === 'paid') {
        patch['payment_status'] = 'refunded';
      }

      await trx('orders').where({ id: order.id }).update(patch);

      if (RESTOCK_ON.includes(next) && !RESTOCK_ON.includes(current)) {
        const items = await trx('order_items').where({ order_id: order.id }).whereNotNull('variant_id');
        for (const item of items) {
          await trx('product_variants')
            .where({ id: item.variant_id as number })
            .increment('stock', item.quantity);
        }
      }

      await trx('order_status_history').insert({
        order_id: order.id,
        status: next,
        note: input.note ?? null,
        changed_by: adminId,
      });

      await audit(adminId, 'order.status', order.id, { from: current, to: next, note: input.note });

      const [items, timeline, coupon] = await Promise.all([
        trx('order_items as oi')
          .leftJoin('products as p', 'p.id', 'oi.product_id')
          .where('oi.order_id', order.id)
          .orderBy('oi.id', 'asc')
          .select('oi.*', 'p.slug')
          .select(
            trx.raw(
              `(SELECT image_url FROM product_images WHERE product_id = oi.product_id ORDER BY sort_order LIMIT 1) as image`,
            ),
          ),
        trx('order_status_history').where({ order_id: order.id }).orderBy('id', 'asc'),
        order.coupon_id ? trx('coupons').where({ id: order.coupon_id }).first() : null,
      ]);
      const fresh = await trx('orders').where({ id: order.id }).first();
      return toOrderDto({ ...fresh!, coupon_code: coupon?.code ?? null }, items, timeline);
    });
  },

  async updatePaymentStatus(
    adminId: number,
    orderNumber: string,
    paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded',
  ): Promise<OrderDto> {
    const order = await db('orders').where({ order_number: orderNumber }).first();
    if (!order) throw ApiError.notFound('Order not found');
    await db('orders').where({ id: order.id }).update({ payment_status: paymentStatus });
    await audit(adminId, 'order.payment_status', order.id, { to: paymentStatus });
    return this.get(orderNumber);
  },
};
