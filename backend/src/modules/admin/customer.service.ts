import { db } from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate, type Paginated } from '../../utils/response.js';
import type { CustomerListQuery } from './customer.schemas.js';

export interface AdminCustomerListItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'suspended';
  orderCount: number;
  totalSpent: number;
  createdAt: string;
}

export interface AdminCustomerDetail extends AdminCustomerListItem {
  addresses: { id: number; name: string; city: string; isDefault: boolean }[];
  orders: {
    orderNumber: string;
    total: number;
    orderStatus: string;
    paymentStatus: string;
    createdAt: string;
  }[];
}

const EXCLUDED = ['cancelled', 'returned'];

export const adminCustomerService = {
  async list(q: CustomerListQuery): Promise<Paginated<AdminCustomerListItem>> {
    const base = db('users').where('role', 'customer');
    if (q.search) {
      base.where((b) =>
        b.where('name', 'like', `%${q.search}%`).orWhere('email', 'like', `%${q.search}%`).orWhere(
          'phone',
          'like',
          `%${q.search}%`,
        ),
      );
    }
    if (q.status) base.where('status', q.status);

    const countRow = await base.clone().count<{ n: number }[]>({ n: 'id' });
    const total = Number(countRow[0]?.n ?? 0);

    const rows = await base
      .clone()
      .orderBy('id', 'desc')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize)
      .select('id', 'name', 'email', 'phone', 'status', 'created_at as createdAt')
      .select(
        db.raw(
          `(SELECT COUNT(*) FROM orders WHERE orders.user_id = users.id AND orders.order_status NOT IN (${EXCLUDED.map(() => '?').join(',')})) as order_count`,
          EXCLUDED,
        ),
        db.raw(
          `(SELECT COALESCE(SUM(total),0) FROM orders WHERE orders.user_id = users.id AND orders.order_status NOT IN (${EXCLUDED.map(() => '?').join(',')})) as total_spent`,
          EXCLUDED,
        ),
      );

    const items = (
      rows as (Omit<AdminCustomerListItem, 'orderCount' | 'totalSpent'> & {
        order_count: number;
        total_spent: number;
      })[]
    ).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      status: r.status,
      createdAt: r.createdAt,
      orderCount: Number(r.order_count),
      totalSpent: Number(r.total_spent),
    }));

    return paginate(items, total, q.page, q.pageSize);
  },

  async get(id: number): Promise<AdminCustomerDetail> {
    const user = await db('users').where({ id, role: 'customer' }).first();
    if (!user) throw ApiError.notFound('Customer not found');

    const [addresses, orders, aggregate] = await Promise.all([
      db('addresses').where({ user_id: id }).select('id', 'name', 'city', 'is_default as isDefault'),
      db('orders')
        .where({ user_id: id })
        .orderBy('id', 'desc')
        .limit(20)
        .select('order_number as orderNumber', 'total', 'order_status as orderStatus', 'payment_status as paymentStatus', 'created_at as createdAt'),
      db('orders')
        .where({ user_id: id })
        .whereNotIn('order_status', EXCLUDED)
        .select(db.raw('COUNT(*) as c'), db.raw('COALESCE(SUM(total),0) as s'))
        .first<{ c: number; s: number }>(),
    ]);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      createdAt: user.created_at,
      orderCount: Number(aggregate?.c ?? 0),
      totalSpent: Number(aggregate?.s ?? 0),
      addresses: addresses.map((a) => ({ ...a, isDefault: !!a.isDefault })),
      orders: orders.map((o) => ({ ...o, total: Number(o.total) })),
    };
  },

  async updateStatus(id: number, status: 'active' | 'suspended'): Promise<void> {
    const user = await db('users').where({ id, role: 'customer' }).first();
    if (!user) throw ApiError.notFound('Customer not found');
    await db('users').where({ id }).update({ status });
  },
};
