import { db } from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { sendMail } from '../mail/mailer.js';
import { customerDiscountMail } from '../mail/templates.js';
import { paginate, type Paginated } from '../../utils/response.js';
import type { CustomerListQuery, GuestListQuery } from './customer.schemas.js';

export interface AdminGuestListItem {
  email: string;
  name: string;
  phone: string | null;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  discountPercent: number;
  discountAmount: number;
}

export interface AdminCustomerListItem {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  status: 'active' | 'suspended';
  discountPercent: number;
  discountAmount: number;
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
      .select('id', 'name', 'email', 'phone', 'status', 'discount_percent', 'discount_amount', 'created_at as createdAt')
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
        discount_percent: number;
        discount_amount: number;
      })[]
    ).map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      phone: r.phone,
      status: r.status,
      discountPercent: Number(r.discount_percent),
      discountAmount: Number(r.discount_amount ?? 0),
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
      discountPercent: Number(user.discount_percent),
      discountAmount: Number(user.discount_amount ?? 0),
      createdAt: user.created_at,
      orderCount: Number(aggregate?.c ?? 0),
      totalSpent: Number(aggregate?.s ?? 0),
      addresses: addresses.map((a) => ({ ...a, isDefault: !!a.isDefault })),
      orders: orders.map((o) => ({ ...o, total: Number(o.total) })),
    };
  },

  async updateDiscount(id: number, discountPercent: number, discountAmount: number): Promise<void> {
    const user = await db('users').where({ id, role: 'customer' }).first();
    if (!user) throw ApiError.notFound('Customer not found');
    const changed =
      Number(user.discount_percent) !== discountPercent || Number(user.discount_amount ?? 0) !== discountAmount;
    await db('users').where({ id }).update({ discount_percent: discountPercent, discount_amount: discountAmount });
    if (changed) {
      const agg = await db('orders')
        .where({ user_id: id })
        .whereNotIn('order_status', EXCLUDED)
        .select(db.raw('COUNT(*) as c'), db.raw('COALESCE(SUM(total),0) as s'))
        .first<{ c: number; s: number }>();
      sendMail(
        customerDiscountMail(user.email, user.name, discountPercent, Number(agg?.s ?? 0), Number(agg?.c ?? 0), discountAmount),
      );
    }
  },

  /** Guest-checkout shoppers (no account), grouped by email, with any admin-set discount. */
  async listGuests(q: GuestListQuery): Promise<Paginated<AdminGuestListItem>> {
    const base = db('orders as o')
      .leftJoin('guest_discounts as gd', 'gd.email', db.raw('LOWER(o.guest_email)'))
      .whereNull('o.user_id')
      .whereNotNull('o.guest_email')
      .groupByRaw('LOWER(o.guest_email)');
    if (q.search) {
      base.where((b) =>
        b.where('o.guest_email', 'like', `%${q.search}%`).orWhere('o.ship_name', 'like', `%${q.search}%`).orWhere(
          'o.ship_phone',
          'like',
          `%${q.search}%`,
        ),
      );
    }

    const countRows = await db
      .from(base.clone().select(db.raw('LOWER(o.guest_email) as e')).as('g'))
      .count<{ n: number }[]>({ n: '*' });
    const total = Number(countRows[0]?.n ?? 0);

    const rows = await base
      .clone()
      .select(
        db.raw('LOWER(o.guest_email) as email'),
        db.raw('SUBSTRING_INDEX(GROUP_CONCAT(o.ship_name ORDER BY o.id DESC SEPARATOR "\\n"), "\\n", 1) as name'),
        db.raw('SUBSTRING_INDEX(GROUP_CONCAT(o.ship_phone ORDER BY o.id DESC SEPARATOR "\\n"), "\\n", 1) as phone'),
        db.raw(
          `SUM(CASE WHEN o.order_status NOT IN (${EXCLUDED.map(() => '?').join(',')}) THEN 1 ELSE 0 END) as order_count`,
          EXCLUDED,
        ),
        db.raw(
          `COALESCE(SUM(CASE WHEN o.order_status NOT IN (${EXCLUDED.map(() => '?').join(',')}) THEN o.total ELSE 0 END), 0) as total_spent`,
          EXCLUDED,
        ),
        db.raw('MAX(o.created_at) as last_order_at'),
        db.raw('MAX(gd.discount_percent) as discount_percent'),
        db.raw('MAX(gd.discount_amount) as discount_amount'),
      )
      .orderByRaw('MAX(o.id) DESC')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize);

    const items = (
      rows as unknown as {
        email: string;
        name: string;
        phone: string | null;
        order_count: number;
        total_spent: number;
        last_order_at: string;
        discount_percent: number | null;
        discount_amount: number | null;
      }[]
    ).map((r) => ({
      email: r.email,
      name: r.name,
      phone: r.phone,
      orderCount: Number(r.order_count),
      totalSpent: Number(r.total_spent),
      lastOrderAt: r.last_order_at,
      discountPercent: Number(r.discount_percent ?? 0),
      discountAmount: Number(r.discount_amount ?? 0),
    }));

    return paginate(items, total, q.page, q.pageSize);
  },

  async updateGuestDiscount(email: string, discountPercent: number, discountAmount: number): Promise<void> {
    const seen = await db('orders').whereNull('user_id').whereRaw('LOWER(guest_email) = ?', [email]).first('id', 'ship_name');
    if (!seen) throw ApiError.notFound('Guest not found');

    const existing = await db('guest_discounts').where({ email }).first();
    const changed =
      Number(existing?.discount_percent ?? 0) !== discountPercent ||
      Number(existing?.discount_amount ?? 0) !== discountAmount;
    const values = { discount_percent: discountPercent, discount_amount: discountAmount };
    if (existing) await db('guest_discounts').where({ email }).update(values);
    else await db('guest_discounts').insert({ email, ...values });

    if (changed) {
      const agg = await db('orders')
        .whereNull('user_id')
        .whereRaw('LOWER(guest_email) = ?', [email])
        .whereNotIn('order_status', EXCLUDED)
        .select(db.raw('COUNT(*) as c'), db.raw('COALESCE(SUM(total),0) as s'))
        .first<{ c: number; s: number }>();
      sendMail(
        customerDiscountMail(email, seen.ship_name, discountPercent, Number(agg?.s ?? 0), Number(agg?.c ?? 0), discountAmount),
      );
    }
  },

  async updateStatus(id: number, status: 'active' | 'suspended'): Promise<void> {
    const user = await db('users').where({ id, role: 'customer' }).first();
    if (!user) throw ApiError.notFound('Customer not found');
    await db('users').where({ id }).update({ status });
  },
};
