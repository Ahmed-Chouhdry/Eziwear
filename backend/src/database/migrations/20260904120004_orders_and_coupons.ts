import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('coupons', (t) => {
    t.increments('id').primary();
    t.string('code', 40).notNullable().unique();
    t.enu('type', ['percentage', 'fixed']).notNullable();
    t.decimal('value', 10, 2).notNullable();
    t.decimal('min_order', 10, 2).nullable();
    t.decimal('max_discount', 10, 2).nullable();
    t.timestamp('start_at').nullable();
    t.timestamp('end_at').nullable();
    t.integer('usage_limit').nullable();
    t.integer('used_count').notNullable().defaultTo(0);
    t.enu('status', ['active', 'inactive']).notNullable().defaultTo('active');
    t.timestamps(true, true);

    t.index(['status']);
  });

  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('RESTRICT');
    t.string('order_number', 32).notNullable().unique();
    t.integer('address_id').unsigned().nullable().references('id').inTable('addresses').onDelete('SET NULL');
    t.integer('coupon_id').unsigned().nullable().references('id').inTable('coupons').onDelete('SET NULL');

    // Snapshot of the shipping address at order time
    t.string('ship_name', 120).notNullable();
    t.string('ship_phone', 30).notNullable();
    t.string('ship_address', 255).notNullable();
    t.string('ship_city', 100).notNullable();
    t.string('ship_area', 100).nullable();
    t.string('ship_postal_code', 20).nullable();

    t.decimal('subtotal', 10, 2).notNullable();
    t.decimal('discount', 10, 2).notNullable().defaultTo(0);
    t.decimal('shipping_fee', 10, 2).notNullable().defaultTo(0);
    t.decimal('total', 10, 2).notNullable();

    t.enu('payment_method', ['cod', 'card']).notNullable().defaultTo('cod');
    t.enu('payment_status', ['pending', 'paid', 'failed', 'refunded']).notNullable().defaultTo('pending');
    t.enu('order_status', [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned',
    ])
      .notNullable()
      .defaultTo('pending');

    t.string('notes', 500).nullable();
    t.timestamps(true, true);

    t.index(['user_id']);
    t.index(['order_status']);
    t.index(['payment_status']);
    t.index(['created_at']);
  });

  await knex.schema.createTable('order_items', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.integer('product_id').unsigned().nullable().references('id').inTable('products').onDelete('SET NULL');
    t.integer('variant_id')
      .unsigned()
      .nullable()
      .references('id')
      .inTable('product_variants')
      .onDelete('SET NULL');

    // Denormalised so order history survives product/variant changes
    t.string('product_name', 180).notNullable();
    t.string('size', 40).notNullable();
    t.string('color', 60).notNullable();
    t.integer('quantity').notNullable();
    t.decimal('unit_price', 10, 2).notNullable();
    t.decimal('subtotal', 10, 2).notNullable();
    t.timestamps(true, true);

    t.index(['order_id']);
  });

  await knex.schema.createTable('order_status_history', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.string('status', 30).notNullable();
    t.string('note', 255).nullable();
    t.integer('changed_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index(['order_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('order_status_history');
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
  await knex.schema.dropTableIfExists('coupons');
}
