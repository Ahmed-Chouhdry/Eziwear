import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Admin-granted discount for guest-checkout shoppers, keyed by (lower-cased) email.
  await knex.schema.createTable('guest_discounts', (t) => {
    t.increments('id').primary();
    t.string('email', 160).notNullable().unique();
    t.decimal('discount_percent', 5, 2).notNullable().defaultTo(0);
    t.timestamps(true, true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('guest_discounts');
}
