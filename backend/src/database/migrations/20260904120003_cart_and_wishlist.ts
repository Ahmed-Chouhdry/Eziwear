import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('carts', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('session_id', 100).nullable();
    t.timestamps(true, true);

    t.unique(['user_id']);
    t.index(['session_id']);
  });

  await knex.schema.createTable('cart_items', (t) => {
    t.increments('id').primary();
    t.integer('cart_id').unsigned().notNullable().references('id').inTable('carts').onDelete('CASCADE');
    t.integer('product_variant_id')
      .unsigned()
      .notNullable()
      .references('id')
      .inTable('product_variants')
      .onDelete('CASCADE');
    t.integer('quantity').notNullable().defaultTo(1);
    t.decimal('unit_price', 10, 2).notNullable();
    t.timestamps(true, true);

    t.unique(['cart_id', 'product_variant_id']);
    t.index(['cart_id']);
  });

  await knex.schema.createTable('wishlists', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.integer('product_id').unsigned().notNullable().references('id').inTable('products').onDelete('CASCADE');
    t.timestamps(true, true);

    t.unique(['user_id', 'product_id']);
    t.index(['user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('wishlists');
  await knex.schema.dropTableIfExists('cart_items');
  await knex.schema.dropTableIfExists('carts');
}
