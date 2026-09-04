import { db } from '../../config/db.js';

const LOW_STOCK_THRESHOLD = 5;
const EXCLUDED_STATUSES = ['cancelled', 'returned'];

export interface AdminStats {
  revenue: number;
  revenueDelivered: number;
  orders: {
    total: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  customers: number;
  products: number;
  vipProducts: number;
  lowStock: number;
  outOfStock: number;
  pendingReviews: number;
}

export interface SalesPoint {
  date: string;
  total: number;
  orders: number;
}

export interface RecentOrder {
  orderNumber: string;
  customer: string;
  total: number;
  itemCount: number;
  orderStatus: string;
  paymentStatus: string;
  createdAt: string;
}

export interface LowStockVariant {
  productId: number;
  productName: string;
  slug: string;
  size: string;
  color: string;
  stock: number;
  sku: string;
}

function num(v: unknown): number {
  return Number(v ?? 0);
}

export const adminService = {
  async stats(): Promise<AdminStats> {
    const [
      revenueRow,
      deliveredRow,
      byStatus,
      customersRow,
      productsRow,
      vipRow,
      lowRow,
      outRow,
      reviewRow,
    ] = await Promise.all([
      db('orders').whereNotIn('order_status', EXCLUDED_STATUSES).sum<{ s: number }[]>({ s: 'total' }),
      db('orders').where('order_status', 'delivered').sum<{ s: number }[]>({ s: 'total' }),
      db('orders').select('order_status').count<{ order_status: string; c: number }[]>({ c: '*' }).groupBy('order_status'),
      db('users').where('role', 'customer').count<{ c: number }[]>({ c: '*' }),
      db('products').where('status', 'published').count<{ c: number }[]>({ c: '*' }),
      db('products').where({ status: 'published', is_vip: true }).count<{ c: number }[]>({ c: '*' }),
      db('product_variants').whereBetween('stock', [1, LOW_STOCK_THRESHOLD]).count<{ c: number }[]>({ c: '*' }),
      db('product_variants').where('stock', 0).count<{ c: number }[]>({ c: '*' }),
      db('reviews').where('status', 'pending').count<{ c: number }[]>({ c: '*' }),
    ]);

    const statusMap = new Map(
      (byStatus as { order_status: string; c: number }[]).map((r) => [r.order_status, num(r.c)]),
    );
    const get = (s: string) => statusMap.get(s) ?? 0;

    return {
      revenue: num(revenueRow[0]?.s),
      revenueDelivered: num(deliveredRow[0]?.s),
      orders: {
        total: [...statusMap.values()].reduce((a, b) => a + b, 0),
        pending: get('pending') + get('confirmed'),
        processing: get('processing'),
        shipped: get('shipped'),
        delivered: get('delivered'),
        cancelled: get('cancelled') + get('returned'),
      },
      customers: num(customersRow[0]?.c),
      products: num(productsRow[0]?.c),
      vipProducts: num(vipRow[0]?.c),
      lowStock: num(lowRow[0]?.c),
      outOfStock: num(outRow[0]?.c),
      pendingReviews: num(reviewRow[0]?.c),
    };
  },

  async salesSeries(days = 14): Promise<SalesPoint[]> {
    const since = new Date(Date.now() - (days - 1) * 86_400_000);
    since.setHours(0, 0, 0, 0);

    const rows = await db('orders')
      .whereNotIn('order_status', EXCLUDED_STATUSES)
      .where('created_at', '>=', since.toISOString().slice(0, 19).replace('T', ' '))
      .select(db.raw('DATE(created_at) as d'))
      .sum<{ d: string; total: number; orders: number }[]>({ total: 'total' })
      .count({ orders: '*' })
      .groupByRaw('DATE(created_at)');

    const byDate = new Map(
      (rows as { d: string; total: number; orders: number }[]).map((r) => [
        String(r.d).slice(0, 10),
        { total: num(r.total), orders: num(r.orders) },
      ]),
    );

    const out: SalesPoint[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10);
      const hit = byDate.get(d);
      out.push({ date: d, total: hit?.total ?? 0, orders: hit?.orders ?? 0 });
    }
    return out;
  },

  async recentOrders(limit = 8): Promise<RecentOrder[]> {
    const rows = await db('orders as o')
      .join('users as u', 'u.id', 'o.user_id')
      .orderBy('o.id', 'desc')
      .limit(limit)
      .select(
        'o.order_number as orderNumber',
        'u.name as customer',
        'o.total',
        'o.order_status as orderStatus',
        'o.payment_status as paymentStatus',
        'o.created_at as createdAt',
      )
      .select(
        db.raw('(SELECT COALESCE(SUM(quantity),0) FROM order_items WHERE order_id = o.id) as itemCount'),
      );
    return (rows as RecentOrder[]).map((r) => ({ ...r, total: num(r.total), itemCount: num(r.itemCount) }));
  },

  async lowStock(limit = 20): Promise<LowStockVariant[]> {
    const rows = await db('product_variants as v')
      .join('products as p', 'p.id', 'v.product_id')
      .where('v.stock', '<=', LOW_STOCK_THRESHOLD)
      .where('p.status', 'published')
      .orderBy('v.stock', 'asc')
      .limit(limit)
      .select(
        'p.id as productId',
        'p.name as productName',
        'p.slug',
        'v.size',
        'v.color',
        'v.stock',
        'v.sku',
      );
    return rows as LowStockVariant[];
  },
};
