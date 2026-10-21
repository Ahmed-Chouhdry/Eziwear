import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // A customer's standing discount is either a percentage OR a flat Rs amount per order.
  await knex.schema.alterTable('users', (t) => {
    t.decimal('discount_amount', 10, 2).notNullable().defaultTo(0);
  });
  await knex.schema.alterTable('guest_discounts', (t) => {
    t.decimal('discount_amount', 10, 2).notNullable().defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('guest_discounts', (t) => t.dropColumn('discount_amount'));
  await knex.schema.alterTable('users', (t) => t.dropColumn('discount_amount'));
}
