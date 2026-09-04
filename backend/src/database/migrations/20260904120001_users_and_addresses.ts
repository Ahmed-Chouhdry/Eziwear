import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('name', 120).notNullable();
    t.string('email', 190).notNullable().unique();
    t.string('phone', 30).nullable();
    t.string('password_hash', 255).notNullable();
    t.enu('role', ['customer', 'admin']).notNullable().defaultTo('customer');
    t.enu('status', ['active', 'suspended']).notNullable().defaultTo('active');
    t.timestamp('email_verified_at').nullable();
    t.timestamps(true, true);

    t.index(['role']);
    t.index(['status']);
  });

  await knex.schema.createTable('addresses', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('name', 120).notNullable();
    t.string('phone', 30).notNullable();
    t.string('address', 255).notNullable();
    t.string('city', 100).notNullable();
    t.string('area', 100).nullable();
    t.string('postal_code', 20).nullable();
    t.boolean('is_default').notNullable().defaultTo(false);
    t.timestamps(true, true);

    t.index(['user_id']);
  });

  await knex.schema.createTable('password_resets', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('token_hash', 255).notNullable();
    t.timestamp('expires_at').notNullable();
    t.timestamp('used_at').nullable();
    t.timestamps(true, true);

    t.index(['user_id']);
    t.index(['token_hash']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('password_resets');
  await knex.schema.dropTableIfExists('addresses');
  await knex.schema.dropTableIfExists('users');
}
