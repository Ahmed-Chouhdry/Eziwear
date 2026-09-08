import type { Knex } from 'knex';

const RETURN_STATUS = [
  'requested',
  'approved',
  'rejected',
  'awaiting_pickup',
  'received',
  'inspected',
  'refunded',
  'exchanged',
  'closed',
  'cancelled',
] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('return_requests', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.enu('status', RETURN_STATUS as unknown as string[]).notNullable().defaultTo('requested');
    t.enu('resolution_type', ['refund', 'exchange']).notNullable();
    t.string('refund_method', 40).nullable(); // store_credit | bank_transfer | original_payment
    t.decimal('refund_amount', 10, 2).nullable();
    t.enu('refund_status', ['pending', 'processing', 'processed']).nullable();
    t.text('admin_notes').nullable();
    t.text('rejection_reason').nullable();
    t.timestamp('requested_at').notNullable().defaultTo(knex.fn.now());
    t.timestamp('updated_at').notNullable().defaultTo(knex.raw('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'));

    t.index(['user_id']);
    t.index(['order_id']);
    t.index(['status']);
  });

  await knex.schema.createTable('return_items', (t) => {
    t.increments('id').primary();
    t.integer('return_request_id').unsigned().notNullable().references('id').inTable('return_requests').onDelete('CASCADE');
    t.integer('order_item_id').unsigned().notNullable().references('id').inTable('order_items').onDelete('CASCADE');
    t.integer('quantity').unsigned().notNullable();
    t.string('reason', 120).notNullable();
    t.text('comment').nullable();
    t.string('photo_url', 500).nullable();
    t.enu('item_status', ['pending', 'accepted', 'rejected']).notNullable().defaultTo('pending');
    t.text('condition_notes').nullable();
    t.timestamps(true, true);

    t.index(['return_request_id']);
    t.index(['order_item_id']);
  });

  await knex.schema.createTable('return_status_history', (t) => {
    t.increments('id').primary();
    t.integer('return_request_id').unsigned().notNullable().references('id').inTable('return_requests').onDelete('CASCADE');
    t.string('status', 40).notNullable();
    t.text('note').nullable();
    t.integer('changed_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('changed_at').notNullable().defaultTo(knex.fn.now());

    t.index(['return_request_id']);
  });

  // Returned/pending quantity per order_item across all non-terminal-rejected requests.
  // Used to stop the same item being over-returned across multiple requests.
  await knex.raw(`
    CREATE OR REPLACE VIEW order_item_returned_qty AS
    SELECT
      ri.order_item_id                                       AS order_item_id,
      COALESCE(SUM(
        CASE WHEN rr.status NOT IN ('rejected', 'cancelled') THEN ri.quantity ELSE 0 END
      ), 0)                                                  AS returned_qty
    FROM return_items ri
    JOIN return_requests rr ON rr.id = ri.return_request_id
    GROUP BY ri.order_item_id
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP VIEW IF EXISTS order_item_returned_qty');
  await knex.schema.dropTableIfExists('return_status_history');
  await knex.schema.dropTableIfExists('return_items');
  await knex.schema.dropTableIfExists('return_requests');
}
