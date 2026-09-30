import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Guest orders have no user account.
  await knex.raw('ALTER TABLE orders MODIFY user_id INT UNSIGNED NULL');
  await knex.schema.alterTable('orders', (t) => {
    t.string('guest_email', 160).nullable();
    t.string('guest_token', 64).nullable();
    t.index(['guest_email']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('orders', (t) => {
    t.dropIndex(['guest_email']);
    t.dropColumn('guest_email');
    t.dropColumn('guest_token');
  });
  await knex('orders').whereNull('user_id').del();
  await knex.raw('ALTER TABLE orders MODIFY user_id INT UNSIGNED NOT NULL');
}
