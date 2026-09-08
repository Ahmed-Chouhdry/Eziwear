import type { Knex } from 'knex';
import { db } from '../../config/db.js';
import { ApiError } from '../../utils/api-error.js';
import { paginate, type Paginated } from '../../utils/response.js';
import type {
  AdminListQuery,
  CreateReturnInput,
  InspectItemInput,
  LogisticsInput,
  RefundInput,
  RejectInput,
} from './return.schemas.js';

const RETURN_WINDOW_DAYS = Number(process.env['RETURN_WINDOW_DAYS'] ?? 7);

type ReturnStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'awaiting_pickup'
  | 'received'
  | 'inspected'
  | 'refunded'
  | 'exchanged'
  | 'closed'
  | 'cancelled';

/** Forward-only state machine. Any transition not listed here is a 400. */
const TRANSITIONS: Record<ReturnStatus, ReturnStatus[]> = {
  requested: ['approved', 'rejected', 'cancelled'],
  approved: ['awaiting_pickup', 'received'],
  awaiting_pickup: ['received'],
  received: ['inspected'],
  inspected: ['refunded', 'exchanged'],
  refunded: ['closed'],
  exchanged: ['closed'],
  rejected: [],
  cancelled: [],
  closed: [],
};

function assertTransition(from: ReturnStatus, to: ReturnStatus): void {
  if (!TRANSITIONS[from].includes(to)) {
    throw ApiError.badRequest(
      `Cannot move a return from "${from}" to "${to}". Allowed next: ${
        TRANSITIONS[from].join(', ') || 'none (terminal)'
      }`,
    );
  }
}

async function audit(adminId: number, action: string, entityId: number, details: Record<string, unknown>) {
  await db('audit_logs').insert({
    admin_id: adminId,
    action,
    entity: 'return_request',
    entity_id: entityId,
    details: JSON.stringify(details),
  });
}

async function logHistory(
  trx: Knex | Knex.Transaction,
  returnRequestId: number,
  status: string,
  changedBy: number | null,
  note?: string,
) {
  await trx('return_status_history').insert({
    return_request_id: returnRequestId,
    status,
    note: note ?? null,
    changed_by: changedBy,
  });
}

async function notify(userId: number, title: string, message: string, link: string) {
  await db('notifications').insert({ user_id: userId, type: 'return', title, message, link });
}

/** delivered_at derived from order_status_history (no dedicated column on orders). */
async function deliveredAt(orderId: number): Promise<Date | null> {
  const row = await db('order_status_history')
    .where({ order_id: orderId, status: 'delivered' })
    .orderBy('id', 'desc')
    .first();
  return row ? new Date(row.created_at) : null;
}

async function ownedOrder(userId: number, orderId: number) {
  const order = await db('orders').where({ id: orderId, user_id: userId }).first();
  if (!order) throw ApiError.notFound('Order not found');
  return order;
}

/** ordered qty minus already requested/processed qty (rejected & cancelled requests don't count). */
async function returnableMap(orderId: number): Promise<Map<number, { item: any; returnable: number }>> {
  const items = await db('order_items').where({ order_id: orderId });
  const returned = await db('order_item_returned_qty')
    .whereIn('order_item_id', items.map((i) => i.id));
  const returnedBy = new Map<number, number>(
    returned.map((r) => [Number(r.order_item_id), Number(r.returned_qty)]),
  );
  const map = new Map<number, { item: any; returnable: number }>();
  for (const item of items) {
    map.set(item.id, {
      item,
      returnable: Math.max(0, Number(item.quantity) - (returnedBy.get(item.id) ?? 0)),
    });
  }
  return map;
}

// ---------------------------------------------------------------------------
// DTO shaping
// ---------------------------------------------------------------------------
function requestDto(r: any) {
  return {
    id: r.id,
    orderId: r.order_id,
    orderNumber: r.order_number,
    status: r.status as ReturnStatus,
    resolutionType: r.resolution_type,
    refundMethod: r.refund_method,
    refundAmount: r.refund_amount != null ? Number(r.refund_amount) : null,
    refundStatus: r.refund_status,
    adminNotes: r.admin_notes,
    rejectionReason: r.rejection_reason,
    requestedAt: r.requested_at,
    updatedAt: r.updated_at,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
  };
}

function itemDto(ri: any) {
  return {
    id: ri.id,
    orderItemId: ri.order_item_id,
    productName: ri.product_name,
    size: ri.size,
    color: ri.color,
    unitPrice: Number(ri.unit_price),
    quantity: ri.quantity,
    reason: ri.reason,
    comment: ri.comment,
    photoUrl: ri.photo_url,
    itemStatus: ri.item_status,
    conditionNotes: ri.condition_notes,
  };
}

async function fullDetail(returnRequestId: number, scopeUserId?: number) {
  const rr = await db('return_requests as rr')
    .join('orders as o', 'o.id', 'rr.order_id')
    .join('users as u', 'u.id', 'rr.user_id')
    .where('rr.id', returnRequestId)
    .modify((q) => scopeUserId && q.where('rr.user_id', scopeUserId))
    .select(
      'rr.*',
      'o.order_number',
      'u.name as customer_name',
      'u.email as customer_email',
    )
    .first();
  if (!rr) throw ApiError.notFound('Return request not found');

  const items = await db('return_items as ri')
    .join('order_items as oi', 'oi.id', 'ri.order_item_id')
    .where('ri.return_request_id', returnRequestId)
    .select('ri.*', 'oi.product_name', 'oi.size', 'oi.color', 'oi.unit_price');

  const history = await db('return_status_history')
    .where({ return_request_id: returnRequestId })
    .orderBy('id', 'asc')
    .select('id', 'status', 'note', 'changed_by', 'changed_at');

  return {
    ...requestDto(rr),
    items: items.map(itemDto),
    history,
  };
}

// ---------------------------------------------------------------------------
export const returnService = {
  // ---------- CUSTOMER ----------
  async eligibility(userId: number, orderId: number) {
    const order = await ownedOrder(userId, orderId);
    const delivered = await deliveredAt(order.id);
    const windowEnds = delivered
      ? new Date(delivered.getTime() + RETURN_WINDOW_DAYS * 86_400_000)
      : null;

    const notDelivered = order.order_status !== 'delivered';
    const windowExpired = !!windowEnds && Date.now() > windowEnds.getTime();

    const map = await returnableMap(order.id);
    const items = [...map.values()]
      .filter((x) => x.returnable > 0)
      .map((x) => ({
        orderItemId: x.item.id,
        productName: x.item.product_name,
        size: x.item.size,
        color: x.item.color,
        unitPrice: Number(x.item.unit_price),
        orderedQuantity: x.item.quantity,
        returnableQuantity: x.returnable,
      }));

    const eligible = !notDelivered && !windowExpired && items.length > 0;
    let reason: string | null = null;
    if (notDelivered) reason = 'This order has not been delivered yet.';
    else if (windowExpired) reason = `The return window closed on ${windowEnds!.toISOString().slice(0, 10)}.`;
    else if (items.length === 0) reason = 'All items in this order have already been returned.';

    return {
      eligible,
      reason,
      orderNumber: order.order_number,
      deliveredAt: delivered ? delivered.toISOString() : null,
      returnWindowEndsAt: windowEnds ? windowEnds.toISOString() : null,
      returnWindowDays: RETURN_WINDOW_DAYS,
      items,
    };
  },

  async create(userId: number, orderId: number, input: CreateReturnInput) {
    const elig = await this.eligibility(userId, orderId);
    if (!elig.eligible) throw ApiError.badRequest(elig.reason ?? 'This order is not eligible for return.');

    const returnableByItem = new Map(elig.items.map((i) => [i.orderItemId, i]));
    for (const line of input.items) {
      const ret = returnableByItem.get(line.order_item_id);
      if (!ret) throw ApiError.badRequest(`Item ${line.order_item_id} is not returnable for this order.`);
      if (line.quantity > ret.returnableQuantity) {
        throw ApiError.badRequest(
          `You can return at most ${ret.returnableQuantity} of "${ret.productName}".`,
        );
      }
    }

    const id = await db.transaction(async (trx) => {
      const [insertedId] = await trx('return_requests').insert({
        order_id: orderId,
        user_id: userId,
        status: 'requested',
        resolution_type: input.resolution_type,
      });
      const rid = Number(insertedId);
      for (const line of input.items) {
        await trx('return_items').insert({
          return_request_id: rid,
          order_item_id: line.order_item_id,
          quantity: line.quantity,
          reason: line.reason,
          comment: line.comment ?? null,
          photo_url: line.photo_url ?? null,
          item_status: 'pending',
        });
      }
      await logHistory(trx, rid, 'requested', userId, 'Return requested by customer');
      return rid;
    });

    await notify(
      userId,
      'Return request received',
      `We've received your return request for order ${elig.orderNumber}. We'll review it shortly.`,
      `/account/returns/${id}`,
    );
    return fullDetail(id, userId);
  },

  async listMine(userId: number, page = 1, pageSize = 20): Promise<Paginated<ReturnType<typeof requestDto>>> {
    const base = db('return_requests as rr')
      .join('orders as o', 'o.id', 'rr.order_id')
      .join('users as u', 'u.id', 'rr.user_id')
      .where('rr.user_id', userId);
    const cnt = await base.clone().count<{ n: number }[]>({ n: "rr.id" }); const n = Number(cnt[0]?.n ?? 0);
    const rows = await base
      .clone()
      .orderBy('rr.id', 'desc')
      .limit(pageSize)
      .offset((page - 1) * pageSize)
      .select('rr.*', 'o.order_number', 'u.name as customer_name', 'u.email as customer_email');
    return paginate(rows.map(requestDto), Number(n), page, pageSize);
  },

  getMine(userId: number, id: number) {
    return fullDetail(id, userId);
  },

  async cancel(userId: number, id: number) {
    const rr = await db('return_requests').where({ id, user_id: userId }).first();
    if (!rr) throw ApiError.notFound('Return request not found');
    assertTransition(rr.status, 'cancelled');
    await db.transaction(async (trx) => {
      await trx('return_requests').where({ id }).update({ status: 'cancelled' });
      await logHistory(trx, id, 'cancelled', userId, 'Cancelled by customer');
    });
    return fullDetail(id, userId);
  },

  // ---------- ADMIN ----------
  async adminList(q: AdminListQuery): Promise<Paginated<ReturnType<typeof requestDto>>> {
    const base = db('return_requests as rr')
      .join('orders as o', 'o.id', 'rr.order_id')
      .join('users as u', 'u.id', 'rr.user_id');
    if (q.status) base.where('rr.status', q.status);
    if (q.from) base.where('rr.requested_at', '>=', q.from);
    if (q.to) base.where('rr.requested_at', '<=', q.to);
    if (q.search) {
      base.where((b) =>
        b
          .where('o.order_number', 'like', `%${q.search}%`)
          .orWhere('u.name', 'like', `%${q.search}%`)
          .orWhere('u.email', 'like', `%${q.search}%`),
      );
    }
    const cnt = await base.clone().count<{ n: number }[]>({ n: "rr.id" }); const n = Number(cnt[0]?.n ?? 0);
    const rows = await base
      .clone()
      .orderBy('rr.id', 'desc')
      .limit(q.pageSize)
      .offset((q.page - 1) * q.pageSize)
      .select('rr.*', 'o.order_number', 'u.name as customer_name', 'u.email as customer_email');
    return paginate(rows.map(requestDto), Number(n), q.page, q.pageSize);
  },

  adminGet(id: number) {
    return fullDetail(id);
  },

  async approve(adminId: number, id: number) {
    const rr = await db('return_requests').where({ id }).first();
    if (!rr) throw ApiError.notFound('Return request not found');
    assertTransition(rr.status, 'approved');
    await db.transaction(async (trx) => {
      await trx('return_requests').where({ id }).update({ status: 'approved' });
      await logHistory(trx, id, 'approved', adminId, 'Return approved');
    });
    await audit(adminId, 'return.approve', id, {});
    await notify(rr.user_id, 'Return approved', 'Your return has been approved. We will arrange pickup / drop-off next.', `/account/returns/${id}`);
    return fullDetail(id);
  },

  async reject(adminId: number, id: number, input: RejectInput) {
    const rr = await db('return_requests').where({ id }).first();
    if (!rr) throw ApiError.notFound('Return request not found');
    assertTransition(rr.status, 'rejected');
    await db.transaction(async (trx) => {
      await trx('return_requests').where({ id }).update({ status: 'rejected', rejection_reason: input.rejection_reason });
      await logHistory(trx, id, 'rejected', adminId, input.rejection_reason);
    });
    await audit(adminId, 'return.reject', id, { rejection_reason: input.rejection_reason });
    await notify(rr.user_id, 'Return rejected', `Your return request was not approved: ${input.rejection_reason}`, `/account/returns/${id}`);
    return fullDetail(id);
  },

  async logistics(adminId: number, id: number, input: LogisticsInput) {
    const rr = await db('return_requests').where({ id }).first();
    if (!rr) throw ApiError.notFound('Return request not found');
    assertTransition(rr.status, input.status);
    await db.transaction(async (trx) => {
      await trx('return_requests').where({ id }).update({ status: input.status });
      await logHistory(trx, id, input.status, adminId, input.note);
    });
    await audit(adminId, 'return.logistics', id, { to: input.status });
    const labels: Record<string, string> = {
      awaiting_pickup: 'Your return is awaiting pickup.',
      received: 'We have received your returned items and will inspect them.',
      inspected: 'Your returned items have been inspected.',
    };
    await notify(rr.user_id, 'Return update', labels[input.status] ?? 'Your return status was updated.', `/account/returns/${id}`);
    return fullDetail(id);
  },

  async inspectItem(adminId: number, id: number, itemId: number, input: InspectItemInput) {
    const rr = await db('return_requests').where({ id }).first();
    if (!rr) throw ApiError.notFound('Return request not found');
    if (!['received', 'inspected'].includes(rr.status)) {
      throw ApiError.badRequest('Items can only be inspected once the return has been received.');
    }
    const item = await db('return_items').where({ id: itemId, return_request_id: id }).first();
    if (!item) throw ApiError.notFound('Return item not found');

    await db('return_items')
      .where({ id: itemId })
      .update({ item_status: input.item_status, condition_notes: input.condition_notes ?? null });

    // Once every item has a decision, roll the request into "inspected".
    const remaining = await db('return_items')
      .where({ return_request_id: id, item_status: 'pending' })
      .count<{ n: number }[]>({ n: 'id' });
    if (Number(remaining[0]?.n ?? 0) === 0 && rr.status !== 'inspected') {
      await db.transaction(async (trx) => {
        await trx('return_requests').where({ id }).update({ status: 'inspected' });
        await logHistory(trx, id, 'inspected', adminId, 'All items inspected');
      });
      await notify(rr.user_id, 'Return inspected', 'Your returned items have been inspected. A refund decision follows.', `/account/returns/${id}`);
    }
    await audit(adminId, 'return.inspect_item', id, { itemId, item_status: input.item_status });
    return fullDetail(id);
  },

  async refund(adminId: number, id: number, input: RefundInput) {
    const rr = await db('return_requests').where({ id }).first();
    if (!rr) throw ApiError.notFound('Return request not found');
    if (rr.status !== 'inspected') {
      throw ApiError.badRequest('A refund can only be processed after all items are inspected.');
    }
    const items = await db('return_items as ri')
      .join('order_items as oi', 'oi.id', 'ri.order_item_id')
      .where('ri.return_request_id', id)
      .select('ri.*', 'oi.unit_price', 'oi.variant_id');
    if (items.some((i) => i.item_status === 'pending')) {
      throw ApiError.badRequest('Every item must be accepted or rejected before refunding.');
    }

    // Authoritative amount — computed server-side, client value ignored.
    const accepted = items.filter((i) => i.item_status === 'accepted');
    const amount = accepted.reduce((sum, i) => sum + Number(i.unit_price) * Number(i.quantity), 0);

    await db.transaction(async (trx) => {
      // Restore stock for accepted items.
      for (const i of accepted) {
        if (i.variant_id) {
          await trx('product_variants').where({ id: i.variant_id }).increment('stock', Number(i.quantity));
        }
      }
      await trx('return_requests').where({ id }).update({
        status: 'refunded',
        refund_method: input.refund_method,
        refund_amount: amount,
        refund_status: 'processed',
      });
      await logHistory(trx, id, 'refunded', adminId, `Refund of ${amount} via ${input.refund_method}`);
      // Auto-close.
      await trx('return_requests').where({ id }).update({ status: 'closed' });
      await logHistory(trx, id, 'closed', null, 'Return closed automatically after refund');
      // Mark the original order returned if everything on it came back.
      await trx('orders').where({ id: rr.order_id }).update({ order_status: 'returned', payment_status: 'refunded' });
    });

    await audit(adminId, 'process_refund', id, {
      refund_method: input.refund_method,
      refund_amount: amount,
      accepted_items: accepted.length,
    });
    await notify(
      rr.user_id,
      'Refund processed',
      `A refund of Rs ${amount.toLocaleString()} has been processed via ${input.refund_method.replace('_', ' ')}.`,
      `/account/returns/${id}`,
    );
    return fullDetail(id);
  },

  async setNotes(adminId: number, id: number, notes: string) {
    const rr = await db('return_requests').where({ id }).first();
    if (!rr) throw ApiError.notFound('Return request not found');
    await db('return_requests').where({ id }).update({ admin_notes: notes });
    await audit(adminId, 'return.notes', id, {});
    return fullDetail(id);
  },
};
